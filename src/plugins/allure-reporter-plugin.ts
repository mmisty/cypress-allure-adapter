import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ExecutableItem,
  ExecutableItemWrapper,
  LabelName,
} from 'allure-js-commons';
import getUuid from 'uuid-by-string';
import getUuidByString from 'uuid-by-string';
import { parseAllure } from 'allure-js-parser';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path, { basename } from 'path';
import glob from 'fast-glob';
import { ReporterOptions } from './allure';
import Debug from 'debug';
import { GlobalHooks } from './allure-global-hook';
import { AllureTaskArgs, ContentType, Stage, Status, StatusType, UNKNOWN } from './allure-types';
import StatusDetails = Cypress.StatusDetails;
import { packageLog } from '../common';

const debug = Debug('cypress-allure:reporter');

const log = (...args: unknown[]) => {
  debug(args);
};

export class AllureReporter {
  // todo config
  private allureResults: string;
  private videos: string;
  private screenshots: string;
  groups: AllureGroup[] = [];
  tests: AllureTest[] = [];
  allTests: { specRelative: string | undefined; fullTitle: string; uuid: string; mochaId: string }[] = [];
  steps: AllureStep[] = [];
  globalHooks = new GlobalHooks(this);

  hooks: { id?: string; hook: ExecutableItemWrapper }[] = [];
  allHooks: { id?: string; hook: ExecutableItemWrapper; suite: string }[] = [];
  currentSpec: Cypress.Spec | undefined;
  allureRuntime: AllureRuntime;
  descriptionHtml: string[] = [];
  attached: string[] = [];
  testStatusStored: AllureTaskArgs<'testStatus'> | undefined;
  testDetailsStored: AllureTaskArgs<'testDetails'> | undefined;

  constructor(opts: ReporterOptions) {
    this.allureResults = opts.allureResults;
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

  get currentTest() {
    if (this.tests.length === 0) {
      log('No current test!');

      return undefined;
    }

    return this.tests[this.tests.length - 1];
  }

  get currentHook() {
    if (this.hooks.length === 0) {
      return undefined;
    }

    return this.hooks[this.hooks.length - 1].hook;
  }

  get currentStep() {
    if (this.steps.length === 0) {
      return undefined;
    }

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
      mkdirSync(this.allureResults);
    }
  }

  hookStarted(arg: AllureTaskArgs<'hookStarted'>) {
    const { title, hookId, date } = arg ?? {};

    if (!this.currentGroup) {
      log(`no current group - start added hook to storage: ${JSON.stringify(arg)}`);
      this.globalHooks.start(title, hookId);

      return;
    }

    if (title && (title.indexOf('before each') !== -1 || title.indexOf('after each') !== -1)) {
      log(`${title} will not be added to suite:${hookId} ${title}`);
      // need to end all steps before logging hook - it should be logged as parent
      this.endAllSteps({ status: UNKNOWN });

      this.startStep({ name: title });

      return;
    }

    if (title) {
      const currentHook = title.indexOf('before') !== -1 ? this.currentGroup.addBefore() : this.currentGroup.addAfter();

      currentHook.name = title;
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

    if (title?.indexOf('before each') !== -1 || title?.indexOf('after each') !== -1) {
      this.endStep({ status: this.currentStep?.isAnyStepFailed ? Status.FAILED : Status.PASSED });

      return;
    }

    if (this.currentHook) {
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
      const uuids = this.allTests.filter(t => t.mochaId == x.testId).map(t => t.uuid);

      uuids.forEach(uuid => {
        const testFile = `${this.allureResults}/${uuid}-result.json`;
        const contents = readFileSync(testFile);
        const ext = path.extname(x.path);
        const name = path.basename(x.path);
        type ParsedAttachment = { name: string; type: ContentType; source: string };
        const testCon: { attachments: ParsedAttachment[] } = JSON.parse(contents.toString());
        const nameAttAhc = `${getUuid(x.path)}-attachment${ext}`; // todo not copy same video
        const newPath = path.join(this.allureResults, nameAttAhc);

        if (!existsSync(newPath)) {
          copyFileSync(x.path, path.join(this.allureResults, nameAttAhc));
        }

        if (!testCon.attachments) {
          testCon.attachments = [];
        }

        testCon.attachments.push({
          name: name,
          type: ContentType.PNG,
          source: nameAttAhc, // todo
        });

        writeFileSync(testFile, JSON.stringify(testCon));
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

      const fileCot = readFileSync(file);

      // to have it in allure-results directory
      const fileNew = `${getUuidByString(fileCot.toString())}-attachment.png`;

      if (!existsSync(this.allureResults)) {
        mkdirSync(this.allureResults);
      }

      if (!existsSync(file)) {
        console.log(`file ${file} doesnt exist`);

        return;
      }
      copyFileSync(file, `${this.allureResults}/${fileNew}`);

      attachTo?.addAttachment(basename(file), { contentType: 'image/png', fileExtension: 'png' }, fileNew);
      this.attached.push(fileNew);
    });
  }

  attachVideoToTests(arg: AllureTaskArgs<'attachVideoToTests'>) {
    const { path: videoPath } = arg;
    log(`attachVideoToTests: ${videoPath}`);
    const ext = '.mp4';
    const specname = basename(videoPath, ext);
    log(specname);
    const res = parseAllure(this.allureResults);
    const tests = res.map(t => ({ path: t.labels.find(l => l.name === 'path')?.value, id: t.uuid }));
    const testsAttach = tests.filter(t => t.path && t.path.indexOf(specname) !== -1);
    log(JSON.stringify(testsAttach));

    testsAttach.forEach(t => {
      const testFile = `${this.allureResults}/${t.id}-result.json`;
      const contents = readFileSync(testFile);
      const testCon = JSON.parse(contents.toString());
      const nameAttAhc = `${getUuid(videoPath)}-attachment${ext}`; // todo not copy same video
      const newPath = path.join(this.allureResults, nameAttAhc);

      if (!existsSync(newPath)) {
        copyFileSync(videoPath, path.join(this.allureResults, nameAttAhc));
      }

      if (!testCon.attachments) {
        testCon.attachments = [];
      }

      testCon.attachments.push({
        name: `${specname}${ext}`,
        type: ContentType.MP4,
        source: nameAttAhc, // todo
      });

      writeFileSync(testFile, JSON.stringify(testCon));
      //testCon.attachments = []
      // need to regenerate ids for testops
      //const files = readdirSync(this.allureResults);
      //files
    });
  }

  endGroup() {
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

      if (paths.length > 1) {
        const pack = `${paths
          .slice(0, paths.length - 1)
          .map(t => t.replace(/\./g, ' '))
          .join('.')}`;
        this.currentTest?.addLabel(LabelName.PACKAGE, pack);
      }
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
    const { title, fullTitle, id } = arg;
    const duplicates = this.allTests.filter(t => t.fullTitle === fullTitle);

    const warn =
      'Starting test with the same fullName as already exist, will be shown as' +
      `retried: ${fullTitle}\nTo solve this rename the test. Spec ${this.currentSpec?.relative}, test full title:  ${fullTitle}`;

    if (duplicates.length > 0) {
      console.warn(`${packageLog} ${warn}`);
    }

    if (!this.currentGroup) {
      // fallback
      this.suiteStarted({ title: 'Root suite', fullTitle: 'Root suite' });
    }

    const group = this.currentGroup;
    const test = group!.startTest(title);

    this.allTests.push({ specRelative: this.currentSpec?.relative, fullTitle, mochaId: id, uuid: test.uuid }); // to show warning
    this.tests.push(test);

    if (this.currentTest) {
      this.currentTest.fullName = fullTitle;

      this.currentTest.historyId = getUuid(fullTitle);
      this.applyGroupLabels();

      if (this.currentSpec?.relative) {
        this.currentTest.addLabel('path', this.currentSpec.relative);
      }
      this.globalHooks.processForTest();
    }
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
      this.currentTest.descriptionHtml = this.descriptionHtml.join('</br>');
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
    const step = this.currentExecutable.startStep(name, date);
    this.steps.push(step);
  }

  endAllSteps(arg: AllureTaskArgs<'stepEnded'>) {
    this.steps.forEach(() => {
      this.endStep(arg);
    });
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
    const fileCot = readFileSync(arg.file);

    // to have it in allure-results directory
    const fileNew = `${getUuidByString(fileCot.toString())}-attachment.txt`;

    if (!existsSync(this.allureResults)) {
      mkdirSync(this.allureResults); //toto try
    }

    copyFileSync(arg.file, `${this.allureResults}/${fileNew}`);
    exec.addAttachment(arg.name, arg.type, fileNew);
  }
}
