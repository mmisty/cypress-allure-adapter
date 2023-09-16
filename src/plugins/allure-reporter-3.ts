import { AllureGroup, AllureRuntime, AllureStep, AllureTest, ExecutableItemWrapper, Status } from 'allure-js-commons';
import {
  addGroupLabelByUser,
  addGroupLabels,
  addPathLabel,
  applyGroupLabels,
  Label,
  setExecutableStatus,
  setLastStepStatus,
} from './allure-utils';
import { findHooksForCurrentSuite, findSiblingsForParents, isType, printTreeWithIndents, SpecTree } from './tree-utils';
import { GlobalHookC } from './allure-global-hook2';
import { AllureTaskArgs, LabelName, UNKNOWN } from './allure-types';
import getUuid from 'uuid-by-string';
import { existsSync, mkdirSync } from 'fs';

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
}

export class AllureReporter3 implements AllureReporter3Api {
  currentSpec: Cypress.Spec | undefined;
  private allureResults: string;
  allureRuntime: AllureRuntime;
  running: SpecTree = new SpecTree();
  labels: Label[] = [];

  // constructor(opts: ReporterOptions) {
  constructor(opts: { allureResults: string }) {
    this.allureResults = opts.allureResults;

    log('Created reporter');
    log(opts);
    this.allureRuntime = new AllureRuntime({ resultsDir: this.allureResults });
  }

  get currentGroup(): AllureGroup | undefined {
    return this.running.currentSuite?.data.value;
  }

  get currentTest(): AllureTest | undefined {
    return this.running.currentTest?.data.value;
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

      // stored hook
      if (globalHook.start) {
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
    const { title, fullTitle, date } = arg;

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
    this.running.addTest(title, test);

    // this.globalHooks.processForTest();
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
    // const storedStatus = this.testStatusStored;
    //const storedDetails = this.testDetailsStored;

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

    /*if (storedDetails) {
      this.setExecutableStatus(this.currentTest, result, storedDetails.details);
    }

    if (storedStatus) {
      this.setExecutableStatus(this.currentTest, storedStatus.result, storedStatus.details);
    }*/

    //this.labels = addGroupLabels(this.running.root, this.running.currentSuite);
    applyGroupLabels(this.currentTest, this.labels);

    this.currentTest.endTest(date);
    // t.data.isEnded = true;
    // todo remove correct
    this.running.endTest();

    //this.descriptionHtml = [];
    //this.testStatusStored = undefined;
    //this.testDetailsStored = undefined;
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
}
