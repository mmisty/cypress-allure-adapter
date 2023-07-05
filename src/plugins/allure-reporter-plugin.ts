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
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path, { basename } from 'path';
import glob from 'fast-glob';
import { ReporterOptions } from './allure';
import Debug from 'debug';
import { GlobalHooks } from './allure-global-hook';
import { AllureTaskArgs, ContentType, Stage, Status, StatusType, UNKNOWN } from './allure-types';

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

    if (this.groups.length === 0 && title === '') {
      return;
    }
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
    this.allureRuntime.writer.writeEnvironmentInfo({ evd: 'test env' });
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
      // need to end all steps before logging hook - should be parent
      this.endAllSteps({ status: UNKNOWN });

      this.startStep({ name: title });

      return;
    }

    const currentHook = title?.indexOf('before') !== -1 ? this.currentGroup.addBefore() : this.currentGroup.addAfter();

    if (currentHook) {
      currentHook.name = title;
      currentHook.wrappedItem.start = date ?? Date.now();
      this.hooks.push({ id: hookId, hook: currentHook });
      this.allHooks.push({ id: hookId, hook: currentHook, suite: this.currentGroup?.uuid });
    }
  }

  hookEnded(arg: AllureTaskArgs<'hookEnded'>) {
    const { title, date, result, details } = arg ?? {};

    if (!this.currentGroup) {
      log('no current group - not logging hook');
      this.globalHooks.end(result, details);

      return;
    }

    if (title?.indexOf('before each') !== -1 || title?.indexOf('after each') !== -1) {
      this.endStep({ status: this.currentStep?.isAnyStepFailed ? Status.FAILED : Status.PASSED });

      return;
    }

    if (this.currentHook) {
      this.currentHook.status = result;
      this.currentHook.stage = Stage.FINISHED;

      if (details) {
        this.currentHook.statusDetails = details;
      }
      this.currentHook.wrappedItem.stop = date ?? Date.now();
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
      console.log(file);
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

      /*const pathDir = allureReporter.allureRuntime.writeAttachment(fileCot, {
      fileExtension: 'png',
      contentType: 'image/png',
    });*/
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

  thread(arg: AllureTaskArgs<'thread'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.THREAD, arg.value);
    }
  }

  host(arg: AllureTaskArgs<'host'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.HOST, arg.value);
    }
  }

  language(arg: AllureTaskArgs<'language'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.LANGUAGE, arg.value);
    }
  }

  epic(arg: AllureTaskArgs<'epic'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.EPIC, arg.value);
    }
  }

  link(arg: AllureTaskArgs<'link'>) {
    if (this.currentTest) {
      this.currentTest.addLink(arg.url, arg.name, arg.type);
    }
  }

  feature(arg: AllureTaskArgs<'feature'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.FEATURE, arg.value);
    }
  }

  story(arg: AllureTaskArgs<'story'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.STORY, arg.value);
    }
  }

  allureId(arg: AllureTaskArgs<'allureId'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.AS_ID, arg.value);
    }
  }

  owner(arg: AllureTaskArgs<'owner'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.OWNER, arg.value);
    }
  }

  fullName(arg: AllureTaskArgs<'fullName'>) {
    if (this.currentTest) {
      this.currentTest.fullName = arg.value;
    }
  }

  lead(arg: AllureTaskArgs<'lead'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.LEAD, arg.value);
    }
  }

  severity(arg: AllureTaskArgs<'severity'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(LabelName.SEVERITY, arg.level);
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

  testAttachment(arg: AllureTaskArgs<'testAttachment'>) {
    if (this.currentTest) {
      const file = this.allureRuntime.writeAttachment(arg.content, arg.type);
      this.currentTest.addAttachment(arg.name, arg.type, file);
    }
  }

  testFileAttachment(arg: AllureTaskArgs<'testFileAttachment'>) {
    if (!this.currentExecutable && this.globalHooks.currentHook) {
      log('No current executable, test or hook - add to global hook');
      this.globalHooks.attachment(arg.name, arg.file, arg.type);

      return;
    }

    if (!this.currentTest) {
      return;
    }

    if (!existsSync(arg.file)) {
      console.log(`file ${arg.file} doesnt exist`);

      return;
    }
    const fileCot = readFileSync(arg.file);

    // to have it in allure-results directory
    const fileNew = `${getUuidByString(fileCot.toString())}-attachment.txt`;

    if (!existsSync(this.allureResults)) {
      mkdirSync(this.allureResults); //toto try
    }

    copyFileSync(arg.file, `${this.allureResults}/${fileNew}`);
    this.currentTest.addAttachment(arg.name, arg.type, fileNew);
  }

  attachment(arg: AllureTaskArgs<'attachment'>) {
    if (this.currentExecutable) {
      const file = this.allureRuntime.writeAttachment(arg.content, arg.type);
      this.currentExecutable.addAttachment(arg.name, arg.type, file);
    }
  }

  applyGroupLabels() {
    this.currentTest?.addLabel(LabelName.PACKAGE, this.groups.map(t => t.name.replace(/\./g, ' ')).join('.'));
    const [parentSuite, suite, subSuite] = this.groups;

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
      'STARTING TEST WITH THE SAME fullName as already, will be shown as' +
      `retried: ${fullTitle}\nTo solve this rename the test. Spec ${this.currentSpec?.relative}`;

    if (duplicates.length > 0) {
      console.warn(warn);
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
        // this.addDescriptionHtml({ value: this.currentSpec.relative });
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
    // this.currentTest.descriptionHtml = (this.currentTest.descriptionHtml ?? '') + descriptionHtml;
    //this.currentTest.des
  }

  applyDescriptionHtml() {
    if (this.currentTest) {
      this.currentTest.descriptionHtml = this.descriptionHtml.join('</br>');
    }
  }

  endTest(arg: AllureTaskArgs<'testEnded'>) {
    const { result, details } = arg;
    this.endAllSteps({ status: result, details });

    // this.currentTest.status = result; //todo
    if (!this.currentTest) {
      return;
    }

    if (result === Status.PASSED) {
      this.currentTest.status = Status.PASSED;
      this.currentTest.stage = Stage.FINISHED;
    }

    if (result === Status.BROKEN) {
      this.currentTest.status = Status.BROKEN;
      this.currentTest.stage = Stage.FINISHED;
    }

    if (result === Status.FAILED) {
      this.currentTest.status = Status.FAILED;
      this.currentTest.stage = Stage.FINISHED;

      this.currentTest.detailsMessage = details?.message;
      this.currentTest.detailsTrace = details?.trace;
    }

    if (result === Status.SKIPPED) {
      this.currentTest.status = Status.SKIPPED;
      this.currentTest.stage = Stage.PENDING;

      this.currentTest.detailsMessage = details?.message || 'Suite disabled';
    }

    if (result !== Status.FAILED && result !== Status.BROKEN && result !== Status.PASSED && result !== Status.SKIPPED) {
      this.currentTest.status = UNKNOWN;
      this.currentTest.stage = Stage.PENDING;

      this.currentTest.detailsMessage = details?.message || `Unknown result: ${result ?? '<no>'}`;
    }

    if (details) {
      this.currentTest.statusDetails = details;
    }
    // this.endSteps();

    /*this.featureProps.apply(a => super.feature(a));
      this.storyProps.apply(a => super.story(a));
      this.frameworkProps.apply(a => super.label(LabelName.FRAMEWORK, a));
      this.languageProps.apply(a => super.label(LabelName.LANGUAGE, a));
      this.hostProps.apply(a => super.label(LabelName.HOST, a));
  
      this.applyDescription();
  
      if (this.config?.autoHistoryId !== false) {
        this.setHistoryId(spec.fullName);
      }
      this.currentTest.endTest(stop || dateNow());*/

    this.currentTest.endTest();

    this.tests.pop();
    this.descriptionHtml = [];
  }

  startStep(arg: AllureTaskArgs<'stepStarted'>) {
    const { name, date } = arg;

    // const executable = this.currentStep ?? this.currentTest;
    if (!this.currentExecutable) {
      log('No current executable, test or hook');
      this.globalHooks.startStep(name);
      //this.currentHookNoGroupCurrent?.steps?.push({ title: name, date: Date.now(), event: 'start' });

      return;
    }
    const step = this.currentExecutable.startStep(name, date);
    this.steps.push(step);
  }

  endAllSteps(arg: AllureTaskArgs<'stepEnded'>) {
    this.steps.forEach(() => {
      this.endStep({ status: arg.status });
    });
  }

  endStep(arg: AllureTaskArgs<'stepEnded'>) {
    const { status, date, details } = arg;

    if (!this.currentExecutable) {
      this.globalHooks.endStep(arg.status, details);

      return;
    }

    if (!this.currentStep) {
      return;
    }

    this.currentStep.status = status;

    // set status to last step recursively
    const setLast = (steps: ExecutableItem[]) => {
      const stepsCount = steps.length;

      if (steps.length > 0) {
        setLast(steps[stepsCount - 1].steps);
        steps[stepsCount - 1].status = status;
      }
    };
    setLast(this.currentStep.wrappedItem.steps);

    if (details) {
      this.currentStep.statusDetails = { message: details?.message };
    }
    this.currentStep.endStep(date);

    this.steps.pop();
  }
}
