import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ExecutableItem,
  ExecutableItemWrapper,
} from 'allure-js-commons';
import getUuid from 'uuid-by-string';
import { parseAllure } from 'allure-js-parser';
import { copyFile, copyFileSync, existsSync, mkdirSync, readFile, readFileSync, writeFile, writeFileSync } from 'fs';
import path, { basename } from 'path';
import glob from 'fast-glob';
import { ReporterOptions } from './allure';
import Debug from 'debug';
import { GlobalHooks } from './allure-global-hook';
import { AllureTaskArgs, LabelName, Stage, Status, StatusType, UNKNOWN } from './allure-types';
import { delay, extname, packageLog } from '../common';
import type { ContentType } from '../common/types';
import { randomUUID } from 'crypto';
import StatusDetails = Cypress.StatusDetails;

const debug = Debug('cypress-allure:reporter');

const log = (...args: unknown[]) => {
  debug(args);
};

const writeTestFile = (testFile: string, content: string, callBack: () => void) => {
  writeFile(testFile, content, errWrite => {
    if (errWrite) {
      log(`error test file  ${errWrite.message} `);

      return;
    }
    log(`write test file done ${testFile} `);
    callBack();
  });
};

// all tests for session
const allTests: {
  specRelative: string | undefined;
  fullTitle: string;
  uuid: string;
  mochaId: string;
  retryIndex: number | undefined;
  status?: Status;
}[] = [];

export class AllureReporter {
  // todo config
  private showDuplicateWarn: boolean;
  private allureResults: string;
  private allureAddVideoOnPass: boolean;
  private videos: string;
  private screenshots: string;
  // testId -> test attempt index -> screenshots
  private screenshotsTest: { [key: string]: { [key: string]: string[] } } = {};
  groups: AllureGroup[] = [];
  tests: AllureTest[] = [];
  steps: AllureStep[] = [];
  attached: { testMochaId?: string; file: string; retryIndex: number | undefined }[] = [];
  globalHooks = new GlobalHooks(this);

  // this is variable for hooks when suite started
  beforeAfterHooksSuite: { id?: string; hook: ExecutableItemWrapper }[] = [];
  allHooks: { id?: string; hook: ExecutableItemWrapper; suite: string }[] = [];
  currentSpec: Cypress.Spec | undefined;
  allureRuntime: AllureRuntime;
  descriptionHtml: string[] = [];
  testStatusStored: AllureTaskArgs<'testStatus'> | undefined;
  testDetailsStored: AllureTaskArgs<'testDetails'> | undefined;

  constructor(opts: ReporterOptions) {
    this.showDuplicateWarn = opts.showDuplicateWarn;
    this.allureResults = opts.allureResults;
    this.allureAddVideoOnPass = opts.allureAddVideoOnPass;
    this.videos = opts.videos;
    this.screenshots = opts.screenshots;

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

  get currentTestAll() {
    if (this.currentTest && allTests[allTests.length - 1]) {
      return allTests[allTests.length - 1];
    }

    return undefined;
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
    if (this.beforeAfterHooksSuite.length === 0) {
      return undefined;
    }

    log('current hook');

    return this.beforeAfterHooksSuite[this.beforeAfterHooksSuite.length - 1].hook;
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
    if ((this.currentTest && title.indexOf('before each') !== -1) || title.indexOf('after each') !== -1) {
      log(`${title} will not be added to suite:${hookId} ${title}`);
      // need to end all steps before logging hook - it should be logged as parent
      this.endAllSteps({ status: UNKNOWN });

      this.startStep({ name: title });

      return;
    }
    // issue #7 - add to parent suite for test to show them
    const currentHook = title.indexOf('before') !== -1 ? this.groups[0].addBefore() : this.groups[0].addAfter();

    currentHook.name = title;
    currentHook.wrappedItem.start = date ?? Date.now();
    this.beforeAfterHooksSuite.push({ id: hookId, hook: currentHook });
    this.allHooks.push({ id: hookId, hook: currentHook, suite: this.currentGroup?.uuid });
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

    if (title?.indexOf('before each') !== -1 || title?.indexOf('after each') !== -1) {
      this.endStep({ status: this.currentStep?.isAnyStepFailed ? Status.FAILED : Status.PASSED });

      return;
    }

    if (this.currentHook) {
      this.currentHook.wrappedItem.stop = date ?? Date.now();
      this.setExecutableStatus(this.currentHook, result, details);

      this.beforeAfterHooksSuite.pop();

      return;
    }
  }

  // for attachments on test start
  processBeforeAfterHooksSuite() {
    // attach failures
  }

  endHooks(status: StatusType = Status.PASSED) {
    this.beforeAfterHooksSuite.forEach(h => {
      this.hookEnded({ title: h.hook.name, result: status });
    });
  }

  attachScreenshots(arg: AllureTaskArgs<'attachScreenshots'>) {
    // attach auto screenshots for fails
    const { screenshots } = arg;
    log('attachScreenshots:');

    if (!screenshots) {
      // no screenshots
      return;
    }
    log('screenshotsTest:');
    log(JSON.stringify(this.screenshotsTest));

    screenshots.forEach(x => {
      console.log(x);

      /*if (
        !this.screenshotsTest[this.keyWhenNoTest(x.testId)]?.[x.testAttemptIndex ?? 0] ||
        this.screenshotsTest[this.keyWhenNoTest(x.testId)][x.testAttemptIndex ?? 0].length === 0
      ) {
        log('no screenshots');

        // no screenshots
        return;
      }

      const screenshotsForTest = this.screenshotsTest[this.keyWhenNoTest(x.testId)][x.testAttemptIndex ?? 0];
      const lastScreen = screenshotsForTest[screenshotsForTest.length - 1];*/

      log(`attachScreenshots:${x.path}`);
      console.log(allTests);

      const uuids = allTests
        .filter(t => t.retryIndex === x.testAttemptIndex && t.mochaId === x.testId && t.status !== Status.PASSED)
        .map(t => t.uuid);

      const alreadyAttached = []; //this.attached.filter(t => t.file === x.path).filter(t => t.testMochaId === x.testId);

      if (alreadyAttached.length > 0) {
        log('already attached');

        return;
      }

      if (uuids.length === 0) {
        log('no attach auto screens, only for non-success tests tests');

        return;
      }

      if (!uuids[x.testAttemptIndex ?? 0]) {
        log(`no attach, cuurenct attampt ${x.testAttemptIndex}`);

        // test passed or no
        return;
      }

      uuids.forEach(uuid => {
        const testFile = `${this.allureResults}/${uuid}-result.json`;
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
      });
    });
  }

  keyWhenNoTest(testId: string | undefined) {
    return testId ?? 'NoTestId';
  }

  screenshotAttachment(arg: AllureTaskArgs<'screenshotAttachment'>) {
    const { testId, path, testAttemptIndex } = arg;
    console.log(arg);

    if (!this.screenshotsTest[this.keyWhenNoTest(testId)]) {
      this.screenshotsTest[this.keyWhenNoTest(testId)] = {};
    }

    if (!this.screenshotsTest[this.keyWhenNoTest(testId)][testAttemptIndex ?? 0]) {
      this.screenshotsTest[this.keyWhenNoTest(testId)][testAttemptIndex ?? 0] = [];
    }
    this.screenshotsTest[this.keyWhenNoTest(testId)][testAttemptIndex ?? 0].push(path);
  }

  screenshotOne(arg: AllureTaskArgs<'screenshotOne'>) {
    const { name, forStep } = arg;

    if (!name) {
      log('No name specified for screenshot, will not attach');

      return;
    }

    const pattern = `${this.screenshots}/**/${name}*.png`;
    const files = glob.sync(pattern);

    if (files.length === 0) {
      log(`NO SCREENSHOTS: ${pattern}`);

      return;
    }

    files.forEach(file => {
      const executable = this.currentExecutable; // currentStep ?? this.currentHook ?? this.currentTest; // todo check
      const attachTo = forStep && this.currentStep ? this.currentStep : executable;
      // to have it in allure-results directory

      const newUuid = randomUUID();
      const fileNew = `${newUuid}-attachment.png`;

      if (!existsSync(this.allureResults)) {
        mkdirSync(this.allureResults, { recursive: true });
      }

      if (!existsSync(file)) {
        console.log(`file ${file} doesnt exist`);

        return;
      }
      copyFileSync(file, `${this.allureResults}/${fileNew}`);

      attachTo?.addAttachment(basename(file), { contentType: 'image/png', fileExtension: 'png' }, fileNew);
    });
  }

  private testsToAttachBySpec(
    specPath: string,
    excludeStatuses: Status[],
  ): { path: string | undefined; id: string; fullName: string | undefined }[] {
    const res = parseAllure(this.allureResults);

    const tests = res
      .filter(t => (this.allureAddVideoOnPass ? true : excludeStatuses.every(s => s !== t.status)))
      // )t.status !== 'passed' && t.status !== 'skipped'
      .map(t => ({
        path: t.labels.find(l => l.name === 'path')?.value,
        id: t.uuid,
        fullName: t.fullName,
      }));

    return tests.filter(t => t.path && t.path.indexOf(specPath) !== -1);
  }

  async attachVideoToTests(arg: AllureTaskArgs<'attachVideoToTests'>) {
    // this happens after test has already finished
    const { path: videoPath } = arg;
    log(`attachVideoToTests: ${videoPath}`);
    const ext = '.mp4';
    const specname = basename(videoPath, ext);
    log(specname);

    const testsAttach = this.testsToAttachBySpec(specname, [Status.PASSED, Status.SKIPPED]);

    let doneFiles = 0;

    readFile(videoPath, (errVideo, _contentVideo) => {
      if (errVideo) {
        console.error(`Could not read video: ${errVideo}`);

        return;
      }

      testsAttach.forEach(test => {
        log(`ATTACHING to ${test.id} ${test.path} ${test.fullName}`);
        const testFile = `${this.allureResults}/${test.id}-result.json`;

        readFile(testFile, (err, contents) => {
          if (err) {
            return;
          }
          const testCon = JSON.parse(contents.toString());
          const uuid = randomUUID();

          // todo do not copy same video
          // currently Allure Testops does not rewrite uploaded results if use same file
          // const uuid = getUuidByString(contentVideo.toString());

          const nameAttAhc = `${uuid}-attachment${ext}`;
          const newPath = path.join(this.allureResults, nameAttAhc);

          if (!testCon.attachments) {
            testCon.attachments = [];
          }
          testCon.attachments.push({
            name: `${specname}${ext}`,
            type: 'video/mp4',
            source: nameAttAhc,
          });

          if (existsSync(newPath)) {
            log(`not writing! video file ${newPath} `);

            writeTestFile(testFile, JSON.stringify(testCon), () => {
              doneFiles = doneFiles + 1;
            });

            return;
          }

          log(`write video file ${newPath} `);
          copyFile(videoPath, newPath, errCopy => {
            if (errCopy) {
              log(`error copy file  ${errCopy.message} `);

              return;
            }
            log(`write test file ${testFile} `);
            writeTestFile(testFile, JSON.stringify(testCon), () => {
              doneFiles = doneFiles + 1;
            });
          });
        });
      });
    });
    const started = Date.now();
    const timeout = 10000;

    while (doneFiles < testsAttach.length) {
      if (Date.now() - started >= timeout) {
        console.error(`Could not write all video attachments in ${timeout}ms`);
        break;
      }
      await delay(100);
    }
  }

  endGroup() {
    // why >= 1?
    if (this.groups.length >= 1) {
      this.addGlobalHooks();
    }

    if (this.currentGroup) {
      this.currentGroup?.endGroup();
      this.groups.pop();
    }
  }

  endAllGroups() {
    this.groups.forEach(g => {
      g.endGroup();
    });
    this.allHooks = [];
  }

  end() {
    // ignore
    // this.attached = [];
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
    }
  }

  parameter(arg: AllureTaskArgs<'parameter'>) {
    if (this.currentExecutable) {
      this.currentExecutable.addParameter(arg.name, arg.value);
    }
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

  applyGroupLabels() {
    const [parentSuite, suite, subSuite] = this.groups;

    if (this.currentSpec) {
      const paths = this.currentSpec.relative?.split('/');
      this.currentTest?.addLabel(LabelName.PACKAGE, paths.join('.'));
    }

    if (this.groups.length > 0) {
      this.currentTest?.addLabel(LabelName.PARENT_SUITE, parentSuite.name);
    }

    if (this.groups.length > 1) {
      this.currentTest?.addLabel(LabelName.SUITE, suite.name);
    }

    if (this.groups.length > 2) {
      this.currentTest?.addLabel(LabelName.SUB_SUITE, subSuite.name);
    }
  }

  startTest(arg: AllureTaskArgs<'testStarted'>) {
    const { title, fullTitle, id, currentRetry } = arg;
    log(`start test: ${fullTitle}`);

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

    // to show warning
    allTests.push({
      retryIndex: currentRetry,
      specRelative: this.currentSpec?.relative,
      fullTitle,
      mochaId: id,
      uuid: test.uuid,
    });

    this.tests.push(test);

    test.fullName = fullTitle;

    test.historyId = getUuid(fullTitle);
    this.applyGroupLabels();

    if (this.currentSpec?.relative) {
      test.addLabel('path', this.currentSpec.relative);
    }
    this.globalHooks.processForTest();
  }

  endTests() {
    this.tests.forEach(() => {
      this.endTest({ result: UNKNOWN, details: undefined });
    });
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

  endTest(arg: AllureTaskArgs<'testEnded'>) {
    const { result, details } = arg;
    log(`end test: ${result}`);
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

    if (this.currentTestAll) {
      this.currentTestAll.status = result;
    }
    this.setExecutableStatus(this.currentTest, result, details);

    if (storedDetails) {
      this.setExecutableStatus(this.currentTest, result, storedDetails.details);
    }

    if (storedStatus) {
      this.setExecutableStatus(this.currentTest, storedStatus.result, storedStatus.details);
    }

    this.currentTest.endTest();

    this.tests.pop();
    this.descriptionHtml = [];
    this.testStatusStored = undefined;
    this.testDetailsStored = undefined;
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
    const file = this.allureRuntime.writeAttachment(arg.content, arg.type);
    exec.addAttachment(arg.name, arg.type, file);
  }

  private executableFileAttachment(
    execToAttach: ExecutableItemWrapper | undefined,
    arg: AllureTaskArgs<'fileAttachment'>,
  ) {
    if (!this.currentExecutable && this.globalHooks.currentHook) {
      log('No current executable, test or hook - add to global hook');
      this.globalHooks.attachment(arg.name, arg.file, arg.type);

      return;
    }

    if (!execToAttach && !this.currentExecutable) {
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

      // how to understand where to attach

      if (execToAttach ?? this.currentExecutable) {
        copyFileSync(arg.file, `${this.allureResults}/${fileNew}`);
        (execToAttach ?? this.currentExecutable)?.addAttachment(arg.name, arg.type, fileNew);
        this.attached.push({
          // toTest: true
          retryIndex: this.currentTestAll?.retryIndex,
          testMochaId: this.currentTestAll?.mochaId,
          file: arg.file,
        });
        log(`added attachment: ${fileNew} ${arg.file}`);
      }
    } catch (err) {
      console.error(`${packageLog} Could not attach ${arg.file}`);
    }
  }
}
