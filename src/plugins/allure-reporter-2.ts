import type { AllureTaskArgs } from './allure-types';
import { LabelName, Stage, UNKNOWN } from './allure-types';
import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ExecutableItem,
  ExecutableItemWrapper,
  Status,
  StatusDetails,
} from 'allure-js-commons';
import getUuid from 'uuid-by-string';
import { GlobalHookC } from './allure-global-hook2';

// const debug = Debug('cypress-allure:reporter2');

const log = (...args: unknown[]) => {
  console.log(...args);
};
type Label = { name: string; value: string };

function applyGroupLabels(test: AllureTest | undefined, labels: Label[]) {
  // apply labels

  const applyLabel = (name: string) => {
    if (!test) {
      return;
    }
    const lb = labels.filter(l => l.name == name);

    // return last added
    const lastLabel = lb[lb.length - 1];

    if (lastLabel) {
      test.addLabel(lastLabel.name, lastLabel.value ?? 'undif');
    }
  };

  applyLabel(LabelName.PARENT_SUITE);
  applyLabel(LabelName.SUITE);
  applyLabel(LabelName.SUB_SUITE);
}
type ItemType = 'group' | 'test' | 'step' | 'hook';
type Data = {
  date?: number;
  value: AllureGroup | AllureTest | AllureStep | GlobalHookC | ExecutableItemWrapper;
  type: ItemType;
  isEnded?: boolean;
};

class RunnerNode<
  T extends ItemType | any,
  U = T extends 'group'
    ? AllureGroup
    : T extends 'test'
    ? AllureTest
    : T extends 'hook'
    ? GlobalHookC | ExecutableItemWrapper
    : T extends 'step'
    ? AllureStep
    : any, //AllureGroup | AllureTest | GlobalHookC | AllureStep
> {
  public next: RunnerNode<any> | undefined;

  constructor(public data: Data) {
    this.next = undefined;
  }

  get item(): U {
    return this.data.value as U;
  }

  /*get group(): AllureGroup | undefined {
    if (this.data.type === 'group' && this.data.value) {
      return this.data.value as AllureGroup;
    }
  }

  get hook(): GlobalHook | undefined {
    if (this.data.type === 'hook' && this.data.value) {
      return this.data.value as GlobalHook;
    }
  }

  get test(): AllureTest | undefined {
    if (this.data.type === 'test' && this.data.value) {
      return this.data.value as AllureTest;
    }
  }*/
}

function setExecutableItemStatus(executableItem: ExecutableItem | undefined, res: Status, dtls?: StatusDetails) {
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

function setExecutableStatus(
  executable: ExecutableItemWrapper | GlobalHookC | undefined,
  res: Status,
  dtls?: StatusDetails,
) {
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

export class AllureReporter2 {
  private allureResults: string;
  allureRuntime: AllureRuntime;
  running: RunnerNode<any> | undefined;
  labels: Label[] = [];

  //constructor(opts: ReporterOptions) {
  constructor(opts: { allureResults: string }) {
    this.allureResults = opts.allureResults;

    log('Created reporter');
    log(opts);
    this.allureRuntime = new AllureRuntime({ resultsDir: this.allureResults });
  }

  addNode(new_data: Data) {
    const new_node = new RunnerNode({ ...new_data, date: Date.now() });

    /* 3. Make next of new Node as head */
    new_node.next = this.running;

    /* 4. Move the head to point to new Node */
    this.running = new_node;
  }

  printList(item?: 'group' | 'test' | 'step') {
    let tnode = this.running;
    const data: { data: Data | undefined }[] = [];

    while (tnode != null) {
      // console.log(`${tnode.data.value.name} `);
      if (item) {
        if (item === tnode.data.type) {
          data.push({ data: tnode.data });
        }
      } else {
        data.push({ data: tnode.data });
      }
      tnode = tnode.next;
    }

    return data;
  }

  get currentGroup(): AllureGroup | undefined {
    return this.currentNode('group')?.item;
  }

  get currentTest(): AllureTest | undefined {
    return this.currentNode('test')?.item;
  }

  get currentStep(): AllureStep | undefined {
    return this.currentNode('step')?.item;
  }

  get currentHook(): GlobalHookC | ExecutableItemWrapper | undefined {
    return this.currentNode('hook')?.item;
  }

  get currentExecutable() {
    return this.currentStep || this.currentTest;
  }

  doEachNode<T extends ItemType>(option: T, callBack: (node: RunnerNode<T>, i: number) => any): void {
    let tnode = this.running;
    let i = 0;

    while (tnode != null) {
      if (option === tnode?.data.type) {
        callBack(tnode, i);
      }
      i++;
      tnode = tnode.next;
    }
  }

  currentNode<T extends ItemType>(option: T): RunnerNode<T> | undefined {
    let tnode = this.running;
    let current: RunnerNode<T> | undefined = undefined;

    while (tnode != null) {
      // console.log(`NODE: ${tnode.data?.value.name} `);

      if (option === tnode?.data.type) {
        current = tnode;
        break;
      }

      // if (option === 'test' && tnode?.data?.isTest && !tnode?.data?.isEnded) {
      //   current = tnode;
      //   break;
      // }

      tnode = tnode.next;
    }
    //console.log(`current: ${current?.data.value.name}`);

    return current;
  }

  hookStarted(arg: AllureTaskArgs<'hookStarted'>) {
    const { title, hookId, date } = arg ?? {};

    // may be for test or global
    const group = this.currentGroup;

    if (!title) {
      return;
    }

    // when before each or after each we create just step inside current test
    if ((this.currentTest && title.indexOf('before each') !== -1) || title.indexOf('after each') !== -1) {
      log(`${title} will not be added to suite:${hookId} ${title}`);
      // need to end all steps before logging hook - it should be logged as parent
      //todo this.endAllSteps({ status: UNKNOWN });

      // todo this.startStep({ name: title });

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

      this.addNode({ type: 'hook', value: currentHook });
    } else {
      this.addNode({ type: 'hook', value: hook });
    }

    //this.hooks.push({ id: hookId, hook: currentHook });
    //this.allHooks.push({ id: hookId, hook: currentHook, suite: this.currentGroup?.uuid });
  }

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
      // todo this.endStep({ status: this.currentStep?.isAnyStepFailed ? Status.FAILED : Status.PASSED });

      return;
    }

    if (this.currentHook) {
      if ((this.currentHook as any).data) {
        (this.currentHook as any).data.stop = date ?? Date.now();
        (this.currentHook as any).data.status = result;
        setExecutableStatus(this.currentHook, result, details);
      } else {
        (this.currentHook as any).wrappedItem.stop = date ?? Date.now();
        setExecutableStatus(this.currentHook, result, details);
      }

      return;
    }
  }

  startGroup(arg: AllureTaskArgs<'suiteStarted'>) {
    const { title } = arg;
    log(`start group: ${title}`);

    const group = (this.currentGroup ?? this.allureRuntime).startGroup(title);

    // log(`SUITES: ${JSON.stringify(this.groups.map(t => t.name))}`);

    // if (this.groups.length === 1) {
    //   this.addGlobalHooks();
    // }

    log('no current group - will end hook in storage');

    // apply al global hooks for suite
    this.doEachNode('hook', globalHook => {
      //console.log(globalHook.item);

      if ((globalHook.item as any).start) {
        const currentHook = globalHook.item.name.indexOf('before') !== -1 ? group.addBefore() : group.addAfter();
        currentHook.name = globalHook.item.name;
        currentHook.wrappedItem.start = (globalHook.item as any).start;
        currentHook.wrappedItem.stop = (globalHook.item as any).stop;

        (globalHook.item as any).addSteps(this);

        setExecutableStatus(currentHook, globalHook.item.status ?? Status.FAILED, globalHook.item.statusDetails);
      } else {
        console.log(globalHook.data.value);

        const hh = globalHook.data.value;

        const currentHook =
          (hh as any as ExecutableItemWrapper).wrappedItem.name?.indexOf('before') !== -1
            ? group.addBefore()
            : group.addAfter();
        currentHook.name = (hh as any as ExecutableItemWrapper).wrappedItem.name ?? 'unknown';
        currentHook.wrappedItem.start = (hh as any as ExecutableItemWrapper).wrappedItem.start;
        currentHook.wrappedItem.stop = (hh as any as ExecutableItemWrapper).wrappedItem.stop;

        setExecutableStatus(
          currentHook,
          (hh as any as ExecutableItemWrapper).status ?? Status.FAILED,
          (hh as any as ExecutableItemWrapper).statusDetails,
        );
      }
    });

    this.addNode({ value: group, type: 'group' });
    /// end
  }

  addGroupLabels() {
    const groups = this.printList('group').map(t => t.data?.value);
    const [parentSuite, suite, subSuite] = groups.reverse();

    // if (this.currentSpec) {
    //   const paths = this.currentSpec.relative?.split('/');
    //   this.currentTest?.addLabel(LabelName.PACKAGE, paths.join('.'));
    // }

    if (groups.length > 0) {
      this.labels.push({ name: LabelName.PARENT_SUITE, value: parentSuite!.name });
    }

    if (groups.length > 1) {
      this.labels.push({ name: LabelName.SUITE, value: suite!.name });
    }

    if (groups.length > 2) {
      this.labels.push({ name: LabelName.SUB_SUITE, value: subSuite!.name });
    }
  }

  current() {
    return this.running;
  }

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
      : (this.currentHook as ExecutableItemWrapper)?.startStep(name, date);
    this.addNode({ type: 'step', value: step });
  }

  // set status to last step recursively
  setLastStepStatus(steps: ExecutableItem[], status: Status, details?: StatusDetails) {
    const stepsCount = steps.length;

    if (stepsCount > 0) {
      this.setLastStepStatus(steps[stepsCount - 1].steps, status, details);
      setExecutableItemStatus(steps[stepsCount - 1], status, details);
    }
  }

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
      this.setLastStepStatus(this.currentExecutable?.wrappedItem.steps ?? [], status, details);

      return;
    }

    this.setLastStepStatus(this.currentStep.wrappedItem.steps, status, details);
    setExecutableStatus(this.currentStep, status, details);
    this.currentStep.endStep(date);
    this.running = this.running?.next;
  }

  startTest(arg: AllureTaskArgs<'testStarted'>) {
    const { title, fullTitle, date } = arg;

    if (this.currentTest) {
      // temp fix of defect with wrong event sequence
      log(`will not start already started test: ${fullTitle}`);

      return;
    }
    //const duplicates = allTests.filter(t => t.fullTitle === fullTitle);

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
    this.addGroupLabels();

    //allTests.push({ specRelative: this.currentSpec?.relative, fullTitle, mochaId: id, uuid: test.uuid }); // to show warning
    //this.tests.push(test);

    test.fullName = fullTitle;

    test.historyId = getUuid(fullTitle);
    this.addNode({ type: 'test', value: test, date });

    // if (this.currentSpec?.relative) {
    //   test.addLabel('path', this.currentSpec.relative);
    // }
    // this.globalHooks.processForTest();
  }

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

    applyGroupLabels(this.currentTest, this.labels);
    this.currentTest.endTest(date);
    // t.data.isEnded = true;
    // todo remove correct
    this.running = this.running?.next;

    //this.descriptionHtml = [];
    //this.testStatusStored = undefined;
    //this.testDetailsStored = undefined;
    this.labels = [];
  }

  endAllSteps(arg: AllureTaskArgs<'stepEnded'>) {
    this.doEachNode('step', step => {
      setExecutableStatus(step.item, arg.status, arg.details);
      step.item.endStep(arg.date);
    });
  }

  endGroup() {
    this.currentNode('group')?.item?.endGroup();

    let tnode = this.running;

    // delete global hooks below group
    // find last group
    while (tnode != null) {
      if (tnode.data.type === 'group') {
        tnode = tnode.next;
        break;
      }
      tnode = tnode.next;
    }

    this.running = tnode;
    //this.running = this.running?.next;
  }
}
