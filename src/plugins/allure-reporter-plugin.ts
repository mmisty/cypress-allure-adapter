import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ExecutableItem,
  ExecutableItemWrapper,
  LabelName,
  StatusDetails,
} from 'allure-js-commons';
import getUuid from 'uuid-by-string';
import getUuidByString from 'uuid-by-string';
import { parseAllure } from 'allure-js-parser';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path, { basename } from 'path';
import glob from 'fast-glob';
import AllureTaskArgs = Cypress.AllureTaskArgs;
import { ReporterOptions } from './allure';
import Debug from 'debug';

const debug = Debug('cypress-allure:reporter');

const log = (...args: unknown[]) => {
  debug(args);
};
enum ContentType {
  TEXT = 'text/plain',
  XML = 'application/xml',
  HTML = 'text/html',
  CSV = 'text/csv',
  TSV = 'text/tab-separated-values',
  CSS = 'text/css',
  URI = 'text/uri-list',
  SVG = 'image/svg+xml',
  PNG = 'image/png',
  JSON = 'application/json',
  ZIP = 'application/zip',
  WEBM = 'video/webm',
  JPEG = 'image/jpeg',
  MP4 = 'video/mp4',
}
enum Status {
  PASSED = 'passed',
  FAILED = 'failed',
  BROKEN = 'broken',
  SKIPPED = 'skipped',
}
const UNKNOWN = 'unknown' as Status;

enum Stage {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  FINISHED = 'finished',
  PENDING = 'pending',
  INTERRUPTED = 'interrupted',
}

class GlobalHooks {
  hooks: {
    title: string;
    status?: Status;
    details?: StatusDetails;
    hookId?: string;
    start: number;
    stop?: number;
    steps?: {
      name: string;
      event: 'start' | 'stop';
      date: number;
      status?: Status;
      details?: StatusDetails;
    }[];
  }[] = [];

  constructor(private reporter: AllureReporter) {}

  hasHooks() {
    return this.hooks.length > 0;
  }

  get currentHook() {
    if (this.hooks.length === 0) {
      log('No current global hook!');

      return undefined;
    }

    return this.hooks[this.hooks.length - 1];
  }

  get currentStep() {
    if (!this.currentHook) {
      return undefined;
    }

    if (!this.currentHook.steps || this.currentHook.steps.length === 0) {
      log('Global hook: no current step');

      return undefined;
    }

    return this.currentHook.steps[this.currentHook.steps.length - 1];
  }

  start(title: string, id?: string) {
    this.hooks.push({ title, hookId: id, start: Date.now() });
  }

  startStep(name: string) {
    if (!this.currentHook) {
      return;
    }

    const step: any = { name, event: 'start', date: Date.now() };

    if (this.currentHook.steps) {
      this.currentHook.steps.push(step);
    } else {
      this.currentHook.steps = [step];
    }
  }

  endStep(status?: Status, details?: StatusDetails) {
    if (!this.currentHook) {
      return;
    }

    if (this.currentStep) {
      const step: any = { name: '', event: 'stop', date: Date.now() };

      if (this.currentHook.steps) {
        this.currentHook.steps.push(step);
      } else {
        this.currentHook.steps = [step];
      }
      this.currentStep.status = status;
      this.currentStep.details = details;
    }
  }

  end(status: Status, details?: StatusDetails) {
    if (this.currentHook) {
      this.currentHook.stop = Date.now();
      this.currentHook.status = status;
      this.currentHook.details = details;
    }
  }

  // when suite created

  process() {
    log('process global hooks');
    const res = this.hooks; //.splice(0, this.hooks.length - 1);
    res.forEach(hook => {
      this.reporter.hookStarted({
        title: hook.title,
        hookId: hook.hookId,
        date: hook.start,
      });

      hook.steps?.forEach(step => {
        if (step.event === 'start') {
          this.reporter.startStep({ name: step.name, date: step.date });
        }

        if (step.event === 'stop') {
          this.reporter.endStep({
            status: step.status as any,
            date: step.date,
            details: step.details,
          });
        }
      });

      this.reporter.hookEnded({
        title: hook.title,
        result: hook.status as any,
        details: hook.details as any,
        date: hook.stop,
      });
    });
  }
}

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

  startGroup(title: string) {
    log(`start group: ${title}`);

    if (this.groups.length === 0 && title === '') {
      return undefined;
    }
    const group = (this.currentGroup ?? this.allureRuntime).startGroup(title);
    this.groups.push(group);
    log(`SUITES: ${JSON.stringify(this.groups.map(t => t.name))}`);

    if (this.groups.length === 1) {
      this.addGlobalHooks();
    }

    return group;
  }

  specStarted(args: AllureTaskArgs<'specStarted'>) {
    log('SPEC started');
    log(JSON.stringify(args));
    this.currentSpec = args.spec;

    // should be once ?
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
      this.endAllSteps({ status: '' });

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
      this.globalHooks.end(result as Status, details);

      return;
    }

    if (title?.indexOf('before each') !== -1 || title?.indexOf('after each') !== -1) {
      this.endStep({ status: this.currentStep?.isAnyStepFailed ? Status.FAILED : Status.PASSED });

      return;
    }

    if (this.currentHook) {
      this.currentHook.status = result as any;
      this.currentHook.stage = Stage.FINISHED;

      if (details) {
        this.currentHook.statusDetails = details;
      }
      this.currentHook.wrappedItem.stop = date ?? Date.now();
      this.hooks.pop();

      return;
    }
  }

  endHooks(status: Status = Status.PASSED) {
    this.hooks.forEach(h => {
      this.hookEnded({ title: h.hook.name, result: status as any });
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
        const testCon = JSON.parse(contents.toString());
        const nameAttAhc = `${getUuid(x.path)}-attachment${ext}`; // todo not copy same video
        const newPath = path.join(this.allureResults, nameAttAhc);

        if (!existsSync(newPath)) {
          copyFileSync(x.path, path.join(this.allureResults, nameAttAhc));
        }

        if (testCon.attachments) {
          testCon.attachments.push({
            name: name,
            type: ContentType.PNG,
            source: nameAttAhc, // todo
          });
        } else {
          testCon.attachments = [
            {
              name: name,
              type: ContentType.PNG,
              source: nameAttAhc, // todo
            },
          ];
        }
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

      return null;
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

        return null;
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

  attachVideoToTests(videoPath: string) {
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

      if (testCon.attachments) {
        testCon.attachments.push({
          name: `${specname}${ext}`,
          type: ContentType.MP4,
          source: nameAttAhc, // todo
        });
      } else {
        testCon.attachments = [
          {
            name: `${specname}${ext}`,
            type: ContentType.MP4,
            source: nameAttAhc, // todo
          },
        ];
      }
      writeFileSync(testFile, JSON.stringify(testCon));
      //testCon.attachments = []

      // "attachments":[{"name":"suite with one test -- #1 test fail (failed).png","type":"image/png","source":"b593b23f-0fe2-4782-acca-ddb5d812e4dd-attachment.png"}]
      //
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

  setLabel(arg: AllureTaskArgs<'setLabel'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(arg.name, arg.value);
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

    const group = this.currentGroup ?? this.startGroup('Root suite');
    const test = group!.startTest(title);

    this.allTests.push({ specRelative: this.currentSpec?.relative, fullTitle, mochaId: id, uuid: test.uuid }); // to show warning
    this.tests.push(test);

    if (this.currentTest) {
      this.currentTest.fullName = fullTitle;

      /*if (title !== autoTitle) {
        this.addDescriptionHtml(
          '<div style="color: #a4951f;">Warn: Test with the same full name already exist (suites + title). Test is shown as retried</br>To solve rename the test</div>',
        );
      }*/
      this.currentTest.historyId = getUuid(fullTitle);
      this.applyGroupLabels();

      if (this.currentSpec?.relative) {
        this.currentTest.addLabel('path', this.currentSpec.relative);
        this.addDescriptionHtml(this.currentSpec.relative);
      }
    }
  }

  endTests() {
    this.tests.forEach(() => {
      this.endTest({ result: 'unknown', details: undefined });
    });
  }

  endGroups() {
    this.endTests();
    this.groups.forEach(() => {
      this.endGroup();
    });
  }

  endAll() {
    this.endAllSteps({ status: 'unknown', details: undefined });
    this.endHooks(Status.BROKEN);
    this.endGroups();
  }

  addDescriptionHtml(descriptionHtml: string) {
    this.descriptionHtml.push(descriptionHtml);
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

    // this.currentTest.status = result as Status; //todo
    if (this.currentTest) {
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

      if (
        result !== Status.FAILED &&
        result !== Status.BROKEN &&
        result !== Status.PASSED &&
        result !== Status.SKIPPED
      ) {
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
    }

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
      this.globalHooks.endStep(arg.status as Status, details);

      return;
    }

    if (this.currentStep) {
      this.currentStep.status = status as Status;

      // set status to last step recursively
      const setLast = (steps: ExecutableItem[]) => {
        const stepsCount = steps.length;

        if (steps.length > 0) {
          setLast(steps[stepsCount - 1].steps);
          steps[stepsCount - 1].status = status as Status;
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
}
