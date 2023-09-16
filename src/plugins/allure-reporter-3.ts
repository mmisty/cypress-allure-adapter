import { AllureGroup, AllureRuntime, AllureStep, AllureTest, ExecutableItemWrapper } from 'allure-js-commons';
import {
  addGroupLabelByUser,
  addGroupLabels,
  addPathLabel,
  applyGroupLabels,
  Label,
  setExecutableStatus,
  setLastStepStatus,
  writeTestFile,
} from './allure-utils';
import {
  findHooksForCurrentSuite,
  findSiblingsForParents,
  getItems,
  isType,
  printTreeWithIndents,
  SpecTree,
} from './tree-utils';
import { GlobalHookC } from './allure-global-hook2';
import { AllureTaskArgs, LabelName, Status, UNKNOWN } from './allure-types';
import getUuid from 'uuid-by-string';
import { copyFile, copyFileSync, existsSync, mkdirSync, readFile, readFileSync, writeFileSync } from 'fs';
import { ReporterOptions } from './allure';
import { delay, extname, packageLog } from '../common';
import { randomUUID } from 'crypto';
import glob from 'fast-glob';
import path, { basename } from 'path';
import { parseAllure } from 'allure-js-parser';
import getUuidByString from 'uuid-by-string';
import { ContentType } from '../common/types';

// const debug = Debug('cypress-allure:reporter2');

const log = (...args: unknown[]) => {
  console.log(...args);
};

interface AllureReporter3Api {
  hookStarted(arg: AllureTaskArgs<'hookStarted'>): void;
  hookEnded(arg: AllureTaskArgs<'hookEnded'>): void;
  startGroup(arg: AllureTaskArgs<'suiteStarted'>): void;
  endGroup(arg: AllureTaskArgs<'suiteEnded'>): void;

  startTest(arg: AllureTaskArgs<'testStarted'>): void;
  endTest(arg: AllureTaskArgs<'testEnded'>): void;

  startStep(arg: AllureTaskArgs<'stepStarted'>): void;
  endStep(arg: AllureTaskArgs<'stepEnded'>): void;
  endAllSteps(arg: AllureTaskArgs<'stepEnded'>): void;

  // allure interface
  suite(arg: AllureTaskArgs<'suite'>): void;
  parentSuite(arg: AllureTaskArgs<'parentSuite'>): void;
  subSuite(arg: AllureTaskArgs<'subSuite'>): void;

  label(arg: AllureTaskArgs<'label'>): void;
  link(arg: AllureTaskArgs<'link'>): void;
  fullName(arg: AllureTaskArgs<'fullName'>): void;
  parameter(arg: AllureTaskArgs<'parameter'>): void;
  testParameter(arg: AllureTaskArgs<'parameter'>): void;

  endAll(arg: AllureTaskArgs<'endAll'>): void;
}

export class AllureReporter3 implements AllureReporter3Api {
  currentSpec: Cypress.Spec | undefined;
  private allureResults: string;
  private showDuplicateWarn: boolean;
  private allureAddVideoOnPass: boolean;
  private videos: string;
  private screenshots: string;
  descriptionHtml: string[] = [];
  testStatusStored: AllureTaskArgs<'testStatus'> | undefined;
  testDetailsStored: AllureTaskArgs<'testDetails'> | undefined;

  allureRuntime: AllureRuntime;
  running: SpecTree = new SpecTree();
  labels: Label[] = [];
  attached: string[] = [];

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

  get currentGroup(): AllureGroup | undefined {
    return this.running.currentSuite?.data.value;
  }

  get currentTest(): AllureTest | undefined {
    return this.running.currentTest?.data.value?.test;
  }

  get currentStep(): AllureStep | undefined {
    return this.running.currentStep?.data.value;
  }

  get currentHook(): GlobalHookC | ExecutableItemWrapper | undefined {
    return this.running.currentHook?.data.value;
  }

  get currentExecutable() {
    return this.currentStep || this.currentTest; // || this.currentHook;
  }

  specStarted(args: AllureTaskArgs<'specStarted'>) {
    log('SPEC started');
    log(JSON.stringify(args));
    this.currentSpec = args.spec;

    if (!existsSync(this.allureResults)) {
      mkdirSync(this.allureResults, { recursive: true });
    }
  }

  // interface
  hookStarted(arg: AllureTaskArgs<'hookStarted'>) {
    const { title, hookId, date } = arg ?? {};

    // may be for test or global
    const group = this.currentGroup;

    if (!title) {
      return;
    }

    // when before each or after each we create just step inside current test
    if (this.currentTest && (title.indexOf('before each') !== -1 || title.indexOf('after each') !== -1)) {
      log(`${title} will not be added to suite:${hookId} ${title}`);
      // need to end all steps before logging hook - it should be logged as parent
      this.endAllSteps({ status: UNKNOWN });
      this.startStep({ name: title });

      return;
    }

    const hook = new GlobalHookC({
      title: title,
      name: title,
      start: date ?? Date.now(),
    });
    //const currentHook = title.indexOf('before') !== -1 ? this.currentGroup.addBefore() : this.currentGroup.addAfter();
    // currentHook.stage
    /*
    currentHook.name = title;
    currentHook.wrappedItem.start = date ?? Date.now();*/

    if (group) {
      const currentHook = title.indexOf('before') !== -1 ? group.addBefore() : group.addAfter();
      currentHook.name = title;
      currentHook.wrappedItem.start = date ?? Date.now();
      // currentHook.wrappedItem.stop = this.currentHook?.stop;

      this.running.addHook(title, currentHook);
    } else {
      this.running.addHook(title, hook);
    }

    //this.hooks.push({ id: hookId, hook: currentHook });
    //this.allHooks.push({ id: hookId, hook: currentHook, suite: this.currentGroup?.uuid });
  }

  // interface
  hookEnded(arg: AllureTaskArgs<'hookEnded'>) {
    const { title, date, result, details } = arg ?? {};

    // if (!this.currentGroup) {
    //   log('no current group - will end hook in storage');
    //   this.doEachNode('hook', r => {});
    //   this.currentNode('hook').this.globalHooks.end(result, details);
    //
    //   return;
    // }

    if (title?.indexOf('before each') !== -1 || title?.indexOf('after each') !== -1) {
      this.endStep({ status: this.currentStep?.isAnyStepFailed ? Status.FAILED : Status.PASSED });

      return;
    }

    if (this.currentHook) {
      if ((this.currentHook as GlobalHookC).isStoredHook) {
        (this.currentHook as GlobalHookC).stop = date ?? Date.now();
        (this.currentHook as GlobalHookC).status = result;
        setExecutableStatus(this.currentHook, result, details);
      } else {
        (this.currentHook as ExecutableItemWrapper).wrappedItem.stop = date ?? Date.now();
        setExecutableStatus(this.currentHook, result, details);
      }

      return;
    }
  }

  // TO INTERFACE
  startGroup(arg: AllureTaskArgs<'suiteStarted'>) {
    const { title } = arg;
    log(`start group: ${title}`);

    const group = (this.currentGroup ?? this.allureRuntime).startGroup(title);

    this.running.addSuite(title, group);
    // log(`SUITES: ${JSON.stringify(this.groups.map(t => t.name))}`);

    // if (this.groups.length === 1) {
    //   this.addGlobalHooks();
    // }

    log('no current group - will end hook in storage');

    // apply all global hooks for suite
    findHooksForCurrentSuite(this.running).forEach(hook => {
      const globalHook = hook.data.value as GlobalHookC;

      if (!this.currentGroup) {
        return;
      }

      if (globalHook.isStoredHook) {
        const currentHook =
          hook.data.name.indexOf('before') !== -1 ? this.currentGroup.addBefore() : this.currentGroup.addAfter();
        currentHook.name = hook.data.name;
        currentHook.wrappedItem.start = globalHook.start;
        currentHook.wrappedItem.stop = globalHook.stop;

        globalHook.addSteps(this);

        setExecutableStatus(currentHook, globalHook.status ?? Status.FAILED, globalHook.statusDetails);
      } else {
        const hh = hook.data.value as ExecutableItemWrapper;

        const currentHook =
          hh.wrappedItem.name?.indexOf('before') !== -1 ? this.currentGroup.addBefore() : this.currentGroup.addAfter();
        currentHook.name = hh.wrappedItem.name ?? 'unknown';
        currentHook.wrappedItem.start = hh.wrappedItem.start;
        currentHook.wrappedItem.stop = hh.wrappedItem.stop;

        setExecutableStatus(currentHook, hh.status ?? Status.FAILED, hh.statusDetails);
      }
    });
  }

  // interface
  startStep(arg: AllureTaskArgs<'stepStarted'>) {
    const { name, date } = arg;

    if (!this.currentGroup && this.currentHook) {
      log('will start step for global hook');
      //this..startStep(name);
      //this.addNode({ type: 'step', value: '' });

      this.currentHook?.startStep(name, date);

      return;
    }

    if (!this.currentExecutable && !this.currentHook) {
      log('cannot start step before hook / test /step');

      return;
    }
    log('start step for current executable');

    const step = this.currentExecutable
      ? this.currentExecutable.startStep(name, date)
      : this.currentHook?.startStep(name, date);

    this.running.addStep('name', step as any); // todo void
  }

  // interface
  endStep(arg: AllureTaskArgs<'stepEnded'>) {
    const { status, date, details } = arg;

    if (!this.currentGroup && this.currentHook) {
      log('No current executable, test or hook - will end step for global hook');

      if ((this.currentHook as any).endStep) {
        (this.currentHook as any).endStep(arg.status, details);
      }

      return;
    }

    if (!this.currentStep) {
      setLastStepStatus(this.currentExecutable?.wrappedItem.steps ?? [], status, details);

      return;
    }

    setLastStepStatus(this.currentStep.wrappedItem.steps, status, details);
    setExecutableStatus(this.currentStep, status, details);
    this.currentStep.endStep(date);
    this.running.endStep();
  }

  // interface
  startTest(arg: AllureTaskArgs<'testStarted'>) {
    const { title, fullTitle, id, date } = arg;

    if (this.currentTest) {
      // temp fix of defect with wrong event sequence
      log(`will not start already started test: ${fullTitle}`);

      return;
    }
    // const duplicates = allTests.filter(t => t.fullTitle === fullTitle);

    /* const warn =
      'Starting test with the same fullName as already exist, will be shown as ' +
      `retried: ${fullTitle}\nTo solve this rename the test. Spec ${this.currentSpec?.relative}, ` +
      `test full title:  ${fullTitle}`;

    if (duplicates.length > 0 && currentRetry === 0 && this.showDuplicateWarn) {
      console.warn(`${packageLog} ${warn}`);
    }*/

    if (!this.currentGroup) {
      // fallback
      this.startGroup({ title: 'Root suite', fullTitle: 'Root suite' });
    }

    const group = this.currentGroup;

    // process globals hooks

    const test = group!.startTest(title, date);

    this.labels = [...addGroupLabels(this.running.root, this.running.currentSuite), ...addPathLabel(this.currentSpec)];

    //allTests.push({ specRelative: this.currentSpec?.relative, fullTitle, mochaId: id, uuid: test.uuid }); // to show warning

    test.fullName = fullTitle;

    test.historyId = getUuid(fullTitle);
    const stored = this.currentHook as GlobalHookC;

    if (stored.isStoredHook) {
      // this.globalHooks.processForTest();
      stored.addAttachments(this);
    }

    this.running.addTest(title, { test, id, uuid: test.uuid });
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

  // interface
  endAllSteps(arg: AllureTaskArgs<'stepEnded'>) {
    findSiblingsForParents(this.running.root, this.running.currentStep, isType('step')).forEach(step => {
      setExecutableStatus(step.data.value, arg.status, arg.details);
      step.data.value.endStep(arg.date);
    });
    this.running.endAllSteps();
  }

  // interface
  endTest(arg: AllureTaskArgs<'testEnded'>) {
    const { result, details, date } = arg;

    //const test = this.currentNode('test');
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

    setExecutableStatus(this.currentTest, result, details);

    if (storedDetails) {
      setExecutableStatus(this.currentTest, result, storedDetails.details);
    }

    if (storedStatus) {
      setExecutableStatus(this.currentTest, storedStatus.result, storedStatus.details);
    }

    applyGroupLabels(this.currentTest, this.labels);

    this.currentTest.endTest(date);
    // todo remove correct
    this.running.endTest();

    this.descriptionHtml = [];
    this.testStatusStored = undefined;
    this.testDetailsStored = undefined;
    this.labels = [];
  }

  endGroup() {
    this.running.currentSuite?.data.value?.endGroup();
    this.running.endSuite();

    /*let tnode = this.running;

    // delete global hooks below group
    // find last group
    while (tnode != null) {
      if (tnode.data.type === 'group') {
        tnode = tnode.next;
        break;
      }
      tnode = tnode.next;
    }

    this.running = tnode;*/
    //this.running = this.running?.next;
  }

  /*endHooks() {
    findSiblingsForParents(this.running.root, this.running.currentHook, isType('hook')).forEach(hook => {
      setExecutableStatus(step.data.value, arg.status, arg.details);
      step.data.value.e(arg.date);
    });
    this.running.endAllSteps();
  }*/

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

  private executableAttachment(exec: ExecutableItemWrapper | undefined, arg: AllureTaskArgs<'attachment'>) {
    if (!exec) {
      log('No current executable - will not attach');

      return;
    }
    const file = this.allureRuntime.writeAttachment(arg.content, arg.type);
    exec.addAttachment(arg.name, arg.type, file);
  }

  endAll() {
    this.endAllSteps({ status: UNKNOWN, details: undefined });

    while (this.currentHook) {
      this.hookEnded({ title: this.running.currentHook?.data.name ?? '', result: Status.BROKEN, details: undefined });
    }

    while (this.currentGroup) {
      this.endGroup();
    }
  }

  printList() {
    return printTreeWithIndents(this.running.root, t => `${t.name}`);
  }

  suite(arg: AllureTaskArgs<'suite'>) {
    if (!this.currentTest) {
      return;
    }
    addGroupLabelByUser(this.labels, LabelName.SUITE, arg.name);
  }

  parentSuite(arg: AllureTaskArgs<'parentSuite'>) {
    if (!this.currentTest) {
      return;
    }

    addGroupLabelByUser(this.labels, LabelName.PARENT_SUITE, arg.name);
  }

  subSuite(arg: AllureTaskArgs<'subSuite'>) {
    if (!this.currentTest) {
      return;
    }
    addGroupLabelByUser(this.labels, LabelName.SUB_SUITE, arg.name);
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

  private executableFileAttachment(exec: ExecutableItemWrapper | undefined, arg: AllureTaskArgs<'fileAttachment'>) {
    if (!this.currentExecutable && !this.currentGroup && this.currentHook) {
      log('No current executable, test or hook - add to global hook');
      // todo
      (this.currentHook as GlobalHookC).addAttachment(arg.name, arg.type, arg.file);

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

      const uuids = getItems(this.running.root, isType('test'))
        .filter(t => t.value.id === x.testId)
        .map(t => t.value.uuid);
      // const uuids = allTests.filter(t => t.mochaId == x.testId).map(t => t.uuid);

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
        console.log(`file ${file} doesnt exist`);

        return;
      }
      copyFileSync(file, `${this.allureResults}/${fileNew}`);

      attachTo?.addAttachment(basename(file), { contentType: 'image/png', fileExtension: 'png' }, fileNew);
      this.attached.push(fileNew);
    });
  }

  async attachVideoToTests(arg: AllureTaskArgs<'attachVideoToTests'>) {
    // this happens after test has already finished
    const { path: videoPath } = arg;
    log(`attachVideoToTests: ${videoPath}`);
    const ext = '.mp4';
    const specname = basename(videoPath, ext);
    log(specname);
    const res = parseAllure(this.allureResults);

    const tests = res
      .filter(t => (this.allureAddVideoOnPass ? true : t.status !== 'passed' && t.status !== 'skipped'))
      .map(t => ({
        path: t.labels.find(l => l.name === 'path')?.value,
        id: t.uuid,
        fullName: t.fullName,
      }));

    const testsAttach = tests.filter(t => t.path && t.path.indexOf(specname) !== -1);

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

            writeTestFile(log, testFile, JSON.stringify(testCon), () => {
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
            writeTestFile(log, testFile, JSON.stringify(testCon), () => {
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
}
