import type { AllureTaskArgs } from './allure-types';
import { AllureGroup, AllureRuntime, AllureStep, AllureTest, Status } from 'allure-js-commons';
import Debug from 'debug';
import getUuid from 'uuid-by-string';
import { LabelName } from './allure-types';

const debug = Debug('cypress-allure:reporter2');

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

type Data = {
  value: AllureGroup | AllureTest | AllureStep;
  type: 'group' | 'test' | 'step' | 'hook';
  isEnded?: boolean;
};

class RunnerNode {
  public next: RunnerNode | undefined;

  constructor(public data: Data) {
    this.next = undefined;
  }

  get group(): AllureGroup | undefined {
    if (this.data.type === 'group' && this.data.value) {
      return this.data.value as AllureGroup;
    }
  }

  get test(): AllureTest | undefined {
    if (this.data.type === 'test' && this.data.value) {
      return this.data.value as AllureTest;
    }
  }
}
export class AllureReporter2 {
  private allureResults: string;
  allureRuntime: AllureRuntime;
  running: RunnerNode | undefined;
  labels: Label[] = [];

  //constructor(opts: ReporterOptions) {
  constructor(opts: { allureResults: string }) {
    this.allureResults = opts.allureResults;

    log('Created reporter');
    log(opts);
    this.allureRuntime = new AllureRuntime({ resultsDir: this.allureResults });
  }

  addNode(new_data: Data) {
    const new_node = new RunnerNode(new_data);

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
    return this.currentNode('group')?.group;
  }

  get currentTest(): AllureTest | undefined {
    return this.currentNode('test')?.data.value as AllureTest;
  }

  currentNode(option: 'group' | 'test' | 'step'): RunnerNode | undefined {
    let tnode = this.running;
    let current: RunnerNode | undefined = undefined;

    while (tnode != null) {
      console.log(`NODE: ${tnode.data?.value.name} `);

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
    console.log(`current: ${current?.data.value.name}`);

    return current;
  }

  startGroup(arg: AllureTaskArgs<'suiteStarted'>) {
    const { title } = arg;
    log(`start group: ${title}`);

    const group = (this.currentGroup ?? this.allureRuntime).startGroup(title);

    this.addNode({ value: group, type: 'group' });

    // log(`SUITES: ${JSON.stringify(this.groups.map(t => t.name))}`);

    // if (this.groups.length === 1) {
    //   this.addGlobalHooks();
    // }
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

  startTest(arg: AllureTaskArgs<'testStarted'>) {
    const { title, fullTitle } = arg;

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
    const test = group!.startTest(title);

    //allTests.push({ specRelative: this.currentSpec?.relative, fullTitle, mochaId: id, uuid: test.uuid }); // to show warning
    //this.tests.push(test);

    test.fullName = fullTitle;

    test.historyId = getUuid(fullTitle);
    this.addNode({ type: 'test', value: test });

    this.addGroupLabels();

    // if (this.currentSpec?.relative) {
    //   test.addLabel('path', this.currentSpec.relative);
    // }
    // this.globalHooks.processForTest();
  }

  endTest() {
    // const test = this.currentNode('test')?.test;

    const t = this.currentNode('test');

    if (t?.test) {
      t.test.status = Status.FAILED;
      applyGroupLabels(t.test, this.labels);
      t.test.endTest();
      t.data.isEnded = true;
      // todo remove correct
      this.running = this.running?.next;
    }
  }

  endGroup() {
    this.currentNode('group')?.group?.endGroup();
    this.running = this.running?.next;
  }
}
