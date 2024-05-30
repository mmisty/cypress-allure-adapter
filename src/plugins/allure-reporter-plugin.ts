import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  Attachment,
  ExecutableItem,
  ExecutableItemWrapper,
  FixtureResult,
  Status,
  StatusDetails,
  TestResult,
} from 'allure-js-commons';
import getUuid from 'uuid-by-string';
import getUuidByString from 'uuid-by-string';
import { parseAllure } from 'allure-js-parser';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path, { basename } from 'path';
import glob from 'fast-glob';
import { ReporterOptions } from './allure';
import Debug from 'debug';
import { GlobalHooks } from './allure-global-hook';
import { AllureTaskArgs, LabelName, Stage, StatusType, UNKNOWN } from './allure-types';
import { extname, packageLog } from '../common';
import type { ContentType } from '../common/types';
import { randomUUID } from 'crypto';
import { copyAttachments, copyFileCp, copyTest, mkdirSyncWithTry, writeResultFile } from './fs-tools';

const beforeEachHookName = '"before each" hook';
const beforeAllHookName = '"before all" hook';
const afterEachHookName = '"after each" hook';

const isBeforeEachHook = (ttl: string | undefined) => ttl?.indexOf(beforeEachHookName) !== -1;
const isAfterEachHook = (ttl: string | undefined) => ttl?.indexOf(afterEachHookName) !== -1;
const isBeforeAllHook = (ttl: string | undefined) => ttl?.indexOf(beforeAllHookName) !== -1;

const log = Debug('cypress-allure:reporter');

const allTasks: any[] = [];

const createNewContentForContainer = (nameAttAhc: string, existingContents: Buffer, ext: string, specname: string) => {
  const getContentJson = () => {
    try {
      return JSON.parse(existingContents.toString());
    } catch (e) {
      console.error(`${packageLog} Could not parse the contents of attachment ${nameAttAhc}`);

      return {};
    }
  };

  const containerJSON = getContentJson();

  const after: ExecutableItem = {
    name: 'video',
    attachments: [
      {
        name: `${specname}${ext}`,
        type: 'video/mp4',
        source: nameAttAhc,
      },
    ],
    parameters: [],
    start: Date.now(),
    stop: Date.now(),
    status: Status.PASSED,
    statusDetails: {},
    stage: Stage.FINISHED,
    steps: [],
  };

  if (!containerJSON.afters) {
    containerJSON.afters = [];
  }

  containerJSON.afters.push(after);

  return containerJSON;
};

/**
 * Will copy test results and all attachments to watch folder
 * for results to appear in TestOps
 * @param input
 * @param allureResultsWatch
 */
const copyFileToWatch = (
  input: { test: string; attachments: { name: string; type: string; source: string }[] },
  allureResultsWatch: string,
) => {
  const { test: allureResultFile, attachments } = input;
  const allureResults = path.dirname(allureResultFile);

  if (allureResults === allureResultsWatch) {
    log(`copyFileToWatch allureResultsWatch the same as allureResults ${allureResults}, will not copy`);

    return;
  }
  mkdirSyncWithTry(allureResultsWatch);

  log(`allureResults: ${allureResults}`);
  log(`allureResultsWatch: ${allureResultsWatch}`);
  log(`attachments: ${JSON.stringify(attachments)}`);

  copyAttachments(allTasks, attachments, allureResultsWatch, allureResultFile);
  copyTest(allTasks, allureResultFile, allureResultsWatch);
};

/**
 * Get all attachments for test to move them to watch folder
 * @param item test item
 */
const getAllAttachments = (item: ExecutableItem): Attachment[] => {
  const attachmentsResult: Attachment[] = [];

  const inner = (steps: ExecutableItem[], accumulatedRes: Attachment[]): Attachment[] => {
    if (steps.length === 0) {
      return accumulatedRes;
    }

    const [first, ...rest] = steps;
    const newRes = [...accumulatedRes, ...first.attachments];

    return inner(rest, newRes);
  };

  const stepAttachments = inner(item.steps, attachmentsResult);

  return [...stepAttachments, ...item.attachments];
};

// all tests for session
const allTests: { specRelative: string | undefined; fullTitle: string; uuid: string; mochaId: string }[] = [];

export class AllureReporter {
  // todo config
  private showDuplicateWarn: boolean;
  private allureResults: string;
  private allureResultsWatch: string;
  private allureAddVideoOnPass: boolean;
  private allureSkipSteps: RegExp[];
  private videos: string;
  private screenshots: string;
  groups: AllureGroup[] = [];
  tests: AllureTest[] = [];
  steps: AllureStep[] = [];
  labels: { name: string; value: string }[] = [];
  globalHooks = new GlobalHooks(this);

  // this is variable for global hooks only
  hooks: { id?: string; hook: ExecutableItemWrapper }[] = [];
  allHooks: { id?: string; hook: ExecutableItemWrapper; suite: string }[] = [];
  currentSpec: Cypress.Spec | undefined;
  allureRuntime: AllureRuntime;
  descriptionHtml: string[] = [];
  attached: string[] = [];
  testStatusStored: AllureTaskArgs<'testStatus'> | undefined;
  testDetailsStored: AllureTaskArgs<'testDetails'> | undefined;

  constructor(opts: ReporterOptions) {
    this.showDuplicateWarn = opts.showDuplicateWarn;
    this.allureResults = opts.allureResults;
    this.allureResultsWatch = opts.techAllureResults;
    this.allureAddVideoOnPass = opts.allureAddVideoOnPass;
    this.videos = opts.videos;
    this.screenshots = opts.screenshots;
    this.allureSkipSteps =
      opts.allureSkipSteps?.split(',').map(x => new RegExp(`^${x.replace(/\./g, '.').replace(/\*/g, '.*')}$`)) ?? [];

    log('Created reporter');
    log(opts);
    this.allureRuntime = new AllureRuntime({ resultsDir: this.allureResults });
  }

  get currentGroup() {
    if (this.groups.length === 0) {
      return undefined;
    }

    return this.groups[this.groups.length - 1];
  }

  get currentTest(): AllureTest | undefined {
    if (this.tests.length === 0) {
      log('No current test!');

      return undefined;
    }

    log('current test');

    return this.tests[this.tests.length - 1];
  }

  get currentHook() {
    if (this.hooks.length === 0) {
      return undefined;
    }

    log('current hook');

    return this.hooks[this.hooks.length - 1].hook;
  }

  get currentStep() {
    if (this.steps.length === 0) {
      return undefined;
    }
    log('current step');

    return this.steps[this.steps.length - 1];
  }

  get currentExecutable() {
    return this.currentStep || this.currentHook || this.currentTest;
  }

  addGlobalHooks() {
    log('>>> add Global Hooks');

    if (this.groups.length > 1 || !this.globalHooks.hasHooks()) {
      log('not root hooks');

      return;
    }

    log('add root hooks');
    this.globalHooks.process();
  }

  suiteStarted(arg: AllureTaskArgs<'suiteStarted'>) {
    const { title } = arg;
    log(`start group: ${title}`);

    const group = (this.currentGroup ?? this.allureRuntime).startGroup(title);
    this.groups.push(group);
    log(`SUITES: ${JSON.stringify(this.groups.map(t => t.name))}`);

    if (this.groups.length === 1) {
      this.addGlobalHooks();
    }
  }

  specStarted(args: AllureTaskArgs<'specStarted'>) {
    log('SPEC started');
    log(JSON.stringify(args));
    this.currentSpec = args.spec;

    if (!existsSync(this.allureResults)) {
      mkdirSync(this.allureResults, { recursive: true });
    }
  }

  hookStarted(arg: AllureTaskArgs<'hookStarted'>) {
    const { title, hookId, date } = arg ?? {};

    if (!this.currentGroup) {
      log(`no current group - start added hook to storage: ${JSON.stringify(arg)}`);
      this.globalHooks.start(title, hookId);

      return;
    }

    if (!title) {
      return;
    }

    // when before each or after each we create just step inside current test
    if (this.currentTest && (isBeforeEachHook(title) || isAfterEachHook(title))) {
      log(`${title} will not be added to suite:${hookId} ${title}`);
      // need to end all steps before logging hook - it should be logged as parent
      this.endAllSteps({ status: UNKNOWN });

      this.startStep({ name: title });

      return;
    }

    if (this.allureSkipSteps.every(t => !t.test(title))) {
      const currentHook = isBeforeAllHook(title) ? this.currentGroup.addBefore() : this.currentGroup.addAfter();

      currentHook.name = title;
      currentHook.wrappedItem.start = date ?? Date.now();
      this.hooks.push({ id: hookId, hook: currentHook });
      this.allHooks.push({ id: hookId, hook: currentHook, suite: this.currentGroup?.uuid });
    } else {
      // create but not add to suite for steps to be added there
      const currentHook = new ExecutableItemWrapper({
        name: title,
        uuid: '',
        historyId: '',
        links: [],
        attachments: [],
        parameters: [],
        labels: [],
        steps: [],
        statusDetails: { message: '', trace: '' },
        stage: Stage.FINISHED,
      });

      currentHook.wrappedItem.start = date ?? Date.now();
      this.hooks.push({ id: hookId, hook: currentHook });
      this.allHooks.push({ id: hookId, hook: currentHook, suite: this.currentGroup?.uuid });
    }
  }

  setExecutableStatus(executable: ExecutableItemWrapper | undefined, res: Status, dtls?: StatusDetails) {
    if (!executable) {
      return;
    }

    if (res === Status.PASSED) {
      executable.status = Status.PASSED;
      executable.stage = Stage.FINISHED;
    }

    if (res === Status.BROKEN) {
      executable.status = Status.BROKEN;
      executable.stage = Stage.FINISHED;
    }

    if (res === Status.FAILED) {
      executable.status = Status.FAILED;
      executable.stage = Stage.FINISHED;

      executable.detailsMessage = dtls?.message;
      executable.detailsTrace = dtls?.trace;
    }

    if (res === Status.SKIPPED) {
      executable.status = Status.SKIPPED;
      executable.stage = Stage.PENDING;

      executable.detailsMessage = dtls?.message || 'Suite disabled';
    }

    if (res !== Status.FAILED && res !== Status.BROKEN && res !== Status.PASSED && res !== Status.SKIPPED) {
      executable.status = UNKNOWN;
      executable.stage = Stage.PENDING;

      executable.detailsMessage = dtls?.message || `Result: ${res ?? '<no>'}`;
    }

    if (dtls) {
      executable.statusDetails = dtls;
    }
  }

  setExecutableItemStatus(executableItem: ExecutableItem | undefined, res: Status, dtls?: StatusDetails) {
    if (!executableItem) {
      return;
    }

    executableItem.status = res;

    if (res === Status.FAILED) {
      if (dtls) {
        executableItem.statusDetails.message = dtls?.message;
        executableItem.statusDetails.trace = dtls?.trace;
      }
    }

    if (res === Status.SKIPPED) {
      executableItem.statusDetails.message = dtls?.message;
    }

    if (res !== Status.FAILED && res !== Status.BROKEN && res !== Status.PASSED && res !== Status.SKIPPED) {
      executableItem.statusDetails.message = dtls?.message;
    }
  }

  hookEnded(arg: AllureTaskArgs<'hookEnded'>) {
    const { title, date, result, details } = arg ?? {};

    if (!this.currentGroup) {
      log('no current group - will end hook in storage');
      this.globalHooks.end(result, details);

      return;
    }

    if (isBeforeEachHook(title) || isAfterEachHook(title)) {
      this.endStep({ status: this.currentStep?.isAnyStepFailed ? Status.FAILED : Status.PASSED });
      this.endAllSteps({ status: UNKNOWN });

      return;
    }

    if (this.currentHook) {
      this.filterSteps(this.currentHook.wrappedItem);
      this.currentHook.wrappedItem.stop = date ?? Date.now();
      this.setExecutableStatus(this.currentHook, result, details);

      this.hooks.pop();

      return;
    }
  }

  endHooks(status: StatusType = Status.PASSED) {
    this.hooks.forEach(h => {
      this.hookEnded({ title: h.hook.name, result: status });
    });
  }

  attachScreenshots(arg: AllureTaskArgs<'attachScreenshots'>) {
    const { screenshots } = arg;
    log('attachScreenshots:');

    screenshots?.forEach(x => {
      const screenshotContent = readFileSync(x.path);
      const guidScreenshot = getUuidByString(screenshotContent.toString());

      if (this.attached.filter(t => t.indexOf(guidScreenshot) !== -1).length > 0) {
        log(`Already attached: ${x.path}`);

        return;
      }

      log(`attachScreenshots:${x.path}`);
      const uuids = allTests.filter(t => t.mochaId == x.testId).map(t => t.uuid);

      uuids.forEach(uuid => {
        const testFile = `${this.allureResults}/${uuid}-result.json`;

        try {
          const contents = readFileSync(testFile);
          const ext = path.extname(x.path);
          const name = path.basename(x.path);
          type ParsedAttachment = { name: string; type: ContentType; source: string };
          const testCon: { attachments: ParsedAttachment[] } = JSON.parse(contents.toString());
          const uuidNew = randomUUID();
          const nameAttAhc = `${uuidNew}-attachment${ext}`; // todo not copy same image
          const newPath = path.join(this.allureResults, nameAttAhc);

          if (!existsSync(newPath)) {
            copyFileSync(x.path, path.join(this.allureResults, nameAttAhc));
          }

          if (!testCon.attachments) {
            testCon.attachments = [];
          }

          testCon.attachments.push({
            name: name,
            type: 'image/png',
            source: nameAttAhc, // todo
          });

          writeFileSync(testFile, JSON.stringify(testCon));
        } catch (e) {
          console.log(`${packageLog} Could not attach screenshot ${x.screenshotId}`);
        }
      });
    });
  }

  screenshotOne(arg: AllureTaskArgs<'screenshotOne'>) {
    const { name, forStep } = arg;

    const pattern = `${this.screenshots}/**/${name}*.png`;
    const files = glob.sync(pattern);

    if (files.length === 0) {
      log(`NO SCREENSHOTS: ${pattern}`);

      return;
    }

    files.forEach(file => {
      const executable = this.currentStep ?? this.currentTest;
      const attachTo = forStep ? executable : this.currentTest;
      // to have it in allure-results directory

      const newUuid = randomUUID();
      const fileNew = `${newUuid}-attachment.png`;

      if (!existsSync(this.allureResults)) {
        mkdirSync(this.allureResults, { recursive: true });
      }

      if (!existsSync(file)) {
        console.log(`${packageLog} file ${file} doesnt exist`);

        return;
      }
      copyFileSync(file, `${this.allureResults}/${fileNew}`);

      attachTo?.addAttachment(basename(file), { contentType: 'image/png', fileExtension: 'png' }, fileNew);
      this.attached.push(fileNew);
    });
  }

  async waitAllTasksToFinish() {
    await Promise.all(allTasks)
      .then(() => {
        log(`All tasks completed (${allTasks.length})`);
      })
      .catch(err => {
        console.error(`${packageLog} Some of tasks (${allTasks.length}) failed:`, err);
      });

    log('All files / video copying tasks finished!');
  }

  /**
   * Attach video to parent suite
   * @param arg {path: string}
   */
  attachVideoToContainers(arg: { path: string }) {
    // this happens after test and suites have already finished
    const { path: videoPath } = arg;
    log(`attachVideoToTests: ${videoPath}`);
    const ext = '.mp4';
    const specname = basename(videoPath, ext);
    log(specname);

    // when video uploads everything is uploaded already (TestOps) except containers
    const res = parseAllure(this.allureResults);

    const tests = res
      .filter(t => (this.allureAddVideoOnPass ? true : t.status !== 'passed' && t.status !== 'skipped'))
      .map(t => ({
        path: t.labels.find((l: any) => l.name === 'path')?.value,
        id: t.uuid,
        fullName: t.fullName,
        parent: t.parent,
      }));

    const testsAttach = tests.filter(t => t.path && t.path.indexOf(specname) !== -1);

    try {
      readFileSync(videoPath);
    } catch (errVideo) {
      console.error(`${packageLog} Could not read video: ${errVideo}`);

      return;
    }

    allTasks.push(
      ...testsAttach.map(test => {
        if (!test.parent) {
          console.error(`${packageLog} not writing videos since test has no parent suite: ${test.fullName}`);

          return Promise.resolve();
        }

        const containerFile = `${this.allureResults}/${test.parent.uuid}-container.json`;
        log(`ATTACHING to container: ${containerFile}`);

        return readFile(containerFile)
          .then(contents => {
            const uuid = randomUUID();
            const nameAttAhc = `${uuid}-attachment${ext}`;
            const newPath = path.join(this.allureResults, nameAttAhc);
            const newContentJson = createNewContentForContainer(nameAttAhc, contents, ext, specname);
            const newContent = JSON.stringify(newContentJson);

            const writeContainer = () => {
              log(`write result file ${containerFile} `);

              return writeResultFile(containerFile, newContent);
            };

            if (existsSync(newPath)) {
              log(`not writing video, file already exists in path ${newPath} `);

              return writeContainer();
            }

            return copyFileCp(videoPath, newPath, false).then(writeContainer);
          })
          .catch(err => {
            log(`error reading container: ${err.message}`);
          });
      }),
    );
  }

  endGroup() {
    // why >= 1?
    if (this.groups.length >= 1) {
      log('addGlobalHooks');
      this.addGlobalHooks();
    }

    if (this.currentGroup) {
      log('END GROUP');
      this.currentGroup?.endGroup();
      this.groups.pop();
    }
  }

  endAllGroups() {
    log('endAllGroups');
    this.groups.forEach(g => {
      g.endGroup();
    });
    this.attached = [];
    this.allHooks = [];
  }

  label(arg: AllureTaskArgs<'label'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(arg.name, arg.value);
    }
  }

  link(arg: AllureTaskArgs<'link'>) {
    if (this.currentTest) {
      this.currentTest.addLink(arg.url, arg.name, arg.type);
    }
  }

  fullName(arg: AllureTaskArgs<'fullName'>) {
    if (this.currentTest) {
      this.currentTest.fullName = arg.value;
      // should update history id when updating title
      this.currentTest.historyId = getUuid(arg.value);
    }
  }

  historyId(arg: AllureTaskArgs<'fullName'>) {
    if (this.currentTest) {
      this.currentTest.historyId = arg.value;
    }
  }

  parameter(arg: AllureTaskArgs<'parameter'>) {
    if (this.currentExecutable) {
      this.currentExecutable.addParameter(arg.name, arg.value);
    }
  }

  private addGroupLabelByUser(label: string, value?: string) {
    if (value === undefined) {
      // remove suite labels
      this.labels = this.labels.filter(t => t.name !== label);
    } else {
      this.labels.push({ name: label, value: value });
    }
  }

  suite(arg: AllureTaskArgs<'suite'>) {
    if (!this.currentTest) {
      return;
    }
    this.addGroupLabelByUser(LabelName.SUITE, arg.name);
  }

  parentSuite(arg: AllureTaskArgs<'parentSuite'>) {
    if (!this.currentTest) {
      return;
    }

    this.addGroupLabelByUser(LabelName.PARENT_SUITE, arg.name);
  }

  subSuite(arg: AllureTaskArgs<'subSuite'>) {
    if (!this.currentTest) {
      return;
    }
    this.addGroupLabelByUser(LabelName.SUB_SUITE, arg.name);
  }

  testParameter(arg: AllureTaskArgs<'parameter'>) {
    if (this.currentTest) {
      this.currentTest.addParameter(arg.name, arg.value);
    }
  }

  testFileAttachment(arg: AllureTaskArgs<'testFileAttachment'>) {
    this.executableFileAttachment(this.currentTest, arg);
  }

  fileAttachment(arg: AllureTaskArgs<'fileAttachment'>) {
    this.executableFileAttachment(this.currentExecutable, arg);
  }

  testAttachment(arg: AllureTaskArgs<'testAttachment'>) {
    this.executableAttachment(this.currentTest, arg);
  }

  attachment(arg: AllureTaskArgs<'attachment'>) {
    this.executableAttachment(this.currentExecutable, arg);
  }

  addGroupLabels() {
    const [parentSuite, suite, subSuite] = this.groups;

    if (this.currentSpec) {
      const paths = this.currentSpec.relative?.split('/');
      this.currentTest?.addLabel(LabelName.PACKAGE, paths.join('.'));
    }

    if (this.groups.length > 0) {
      this.labels.push({ name: LabelName.PARENT_SUITE, value: parentSuite.name });
    }

    if (this.groups.length > 1) {
      this.labels.push({ name: LabelName.SUITE, value: suite.name });
    }

    if (this.groups.length > 2) {
      this.labels.push({ name: LabelName.SUB_SUITE, value: subSuite.name });
    }
  }

  startTest(arg: AllureTaskArgs<'testStarted'>) {
    const { title, fullTitle, id, currentRetry } = arg;

    if (this.currentTest) {
      // temp fix of defect with wrong event sequence
      log(`will not start already started test: ${fullTitle}`);

      return;
    }
    const duplicates = allTests.filter(t => t.fullTitle === fullTitle);

    const warn =
      'Starting test with the same fullName as already exist, will be shown as ' +
      `retried: ${fullTitle}\nTo solve this rename the test. Spec ${this.currentSpec?.relative}, ` +
      `test full title:  ${fullTitle}`;

    if (duplicates.length > 0 && currentRetry === 0 && this.showDuplicateWarn) {
      console.warn(`${packageLog} ${warn}`);
    }

    if (!this.currentGroup) {
      // fallback
      this.suiteStarted({ title: 'Root suite', fullTitle: 'Root suite' });
    }

    const group = this.currentGroup;
    const test = group!.startTest(title);

    allTests.push({ specRelative: this.currentSpec?.relative, fullTitle, mochaId: id, uuid: test.uuid }); // to show warning
    this.tests.push(test);

    test.fullName = fullTitle;

    test.historyId = getUuid(fullTitle);
    this.addGroupLabels();

    if (this.currentSpec?.relative) {
      test.addLabel('path', this.currentSpec.relative);
    }
    this.globalHooks.processForTest();
  }

  endTests() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _tst of this.tests) {
      this.endTest({ result: UNKNOWN, details: undefined });
    }
  }

  endGroups() {
    this.endTests();
    this.groups.forEach(() => {
      this.endGroup();
    });
  }

  endAll() {
    this.endAllSteps({ status: UNKNOWN, details: undefined });
    this.endHooks(Status.BROKEN);
    this.endGroups();
  }

  addDescriptionHtml(arg: AllureTaskArgs<'addDescriptionHtml'>) {
    this.descriptionHtml.push(arg.value);
    this.applyDescriptionHtml();
  }

  applyDescriptionHtml() {
    if (this.currentTest) {
      this.currentTest.descriptionHtml = this.descriptionHtml.join('');
    }
  }

  testStatus(arg: AllureTaskArgs<'testStatus'>) {
    if (!this.currentTest) {
      return;
    }
    this.testStatusStored = arg;
  }

  testDetails(arg: AllureTaskArgs<'testDetails'>) {
    if (!this.currentTest) {
      return;
    }
    this.testDetailsStored = arg;
  }

  applyGroupLabels() {
    // apply labels

    const applyLabel = (name: string) => {
      if (!this.currentTest) {
        return;
      }
      const lb = this.labels.filter(l => l.name == name);

      // return last added
      const lastLabel = lb[lb.length - 1];

      if (lastLabel) {
        this.currentTest.addLabel(lastLabel.name, lastLabel.value);
      }
    };

    applyLabel(LabelName.PARENT_SUITE);
    applyLabel(LabelName.SUITE);
    applyLabel(LabelName.SUB_SUITE);
  }

  filterSteps(result: FixtureResult | TestResult | undefined) {
    const skipSteps = this.allureSkipSteps;

    if (result && result.steps.length > 0) {
      result.steps = result.steps.filter(t => !skipSteps.some(x => x.test(t.name ?? '')));
      result.steps.forEach(res => {
        this.filterSteps(res);
      });
    }
  }

  endTest(arg: AllureTaskArgs<'testEnded'>): void {
    const { result, details } = arg;
    const storedStatus = this.testStatusStored;
    const storedDetails = this.testDetailsStored;

    /*
      todo case when all steps finished but test failed
      if (this.steps.length === 0) {
       */
    // all ended already
    /*this.currentExecutable?.wrappedItem.steps && this.currentExecutable.wrappedItem.steps.length > 0) {
        this.startStep({ name: 'some of previous steps failed' });
        this.endStep({ status: arg.result, details: arg.details });
      }
      }
    */
    this.endAllSteps({ status: result, details });

    if (!this.currentTest) {
      return;
    }
    // filter steps here
    this.filterSteps(this.currentTest.wrappedItem);

    this.setExecutableStatus(this.currentTest, result, details);

    if (storedDetails) {
      this.setExecutableStatus(this.currentTest, result, storedDetails.details);
    }

    if (storedStatus) {
      this.setExecutableStatus(this.currentTest, storedStatus.result, storedStatus.details);
    }

    this.applyGroupLabels();
    const uid = this.currentTest.uuid;

    //const resAtt: Attachment[] = [...this.currentTest.wrappedItem.attachments];
    const attachments = getAllAttachments(this.currentTest.wrappedItem);
    this.currentTest.endTest();
    this.tests.pop();
    this.descriptionHtml = [];
    this.testStatusStored = undefined;
    this.testDetailsStored = undefined;
    this.labels = [];

    const waitResultWritten = (results: string, file: string) => {
      const started = Date.now();

      while (!(Date.now() - started > 10000 || existsSync(file))) {
        // do sync
      }

      if (!existsSync(file)) {
        console.error(`${packageLog} Result file doesn't exist: ${file}`);
      }
    };
    const testFile = `${this.allureResults}/${uid}-result.json`;

    waitResultWritten(this.allureResults, testFile);

    // move to watch
    log('testEnded: will move result to watch folder');
    copyFileToWatch({ test: testFile, attachments }, this.allureResultsWatch);
  }

  startStep(arg: AllureTaskArgs<'stepStarted'>) {
    const { name, date } = arg;

    if (!this.currentExecutable || this.globalHooks.currentHook) {
      log('will start step for global hook');
      this.globalHooks.startStep(name);

      return;
    }
    log('start step for current executable');
    const step = this.currentExecutable.startStep(name, date);
    this.steps.push(step);
  }

  endAllSteps(arg: AllureTaskArgs<'stepEnded'>) {
    while (this.steps.length !== 0) {
      this.endStep(arg);
    }
  }

  // set status to last step recursively
  setLastStepStatus(steps: ExecutableItem[], status: Status, details?: StatusDetails) {
    const stepsCount = steps.length;

    if (stepsCount > 0) {
      this.setLastStepStatus(steps[stepsCount - 1].steps, status, details);
      this.setExecutableItemStatus(steps[stepsCount - 1], status, details);
    }
  }

  endStep(arg: AllureTaskArgs<'stepEnded'>) {
    const { status, date, details } = arg;

    if (!this.currentExecutable) {
      log('No current executable, test or hook - will end step for global hook');
      this.globalHooks.endStep(arg.status, details);

      return;
    }

    if (!this.currentStep) {
      this.setLastStepStatus(this.currentExecutable.wrappedItem.steps, status, details);

      return;
    }

    this.setLastStepStatus(this.currentStep.wrappedItem.steps, status, details);
    this.setExecutableStatus(this.currentStep, status, details);
    this.currentStep.endStep(date);

    this.steps.pop();
  }

  private executableAttachment(exec: ExecutableItemWrapper | undefined, arg: AllureTaskArgs<'attachment'>) {
    if (!exec) {
      log('No current executable - will not attach');

      return;
    }

    const file = this.allureRuntime.writeAttachment(
      arg.content ?? `Could not create attachment: no content for ${arg.name} received`,
      arg.type,
    );
    exec.addAttachment(arg.name, arg.type, file);
  }

  private executableFileAttachment(exec: ExecutableItemWrapper | undefined, arg: AllureTaskArgs<'fileAttachment'>) {
    if (!this.currentExecutable && this.globalHooks.currentHook) {
      log('No current executable, test or hook - add to global hook');
      this.globalHooks.attachment(arg.name, arg.file, arg.type);

      return;
    }

    if (!exec) {
      return;
    }

    if (!existsSync(arg.file)) {
      console.log(`${packageLog} Attaching file: file ${arg.file} doesnt exist`);

      return;
    }

    try {
      const uuid = randomUUID();

      // to have it in allure-results directory
      const fileNew = `${uuid}-attachment${extname(arg.file)}`;

      if (!existsSync(this.allureResults)) {
        mkdirSync(this.allureResults, { recursive: true });
      }

      copyFileSync(arg.file, `${this.allureResults}/${fileNew}`);
      exec.addAttachment(arg.name, arg.type, fileNew);
    } catch (err) {
      console.error(`${packageLog} Could not attach ${arg.file}`);
    }
  }
}
