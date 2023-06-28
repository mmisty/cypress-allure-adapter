import { AllureGroup, AllureRuntime, AllureStep, AllureTest, LabelName, Status } from 'allure-js-commons';
import AllureTaskArgs = Cypress.AllureTaskArgs;
import getUuid from 'uuid-by-string';

export class AllureReporter {
  private defaultDir = 'allure-results';
  // todo config
  groups: AllureGroup[] = [];
  tests: AllureTest[] = [];
  steps: AllureStep[] = [];
  currentSpec: Cypress.Spec | undefined;
  allureRuntime: AllureRuntime;

  constructor(allureResults?: string) {
    this.allureRuntime = new AllureRuntime({ resultsDir: allureResults ?? this.defaultDir });
  }

  get currentGroup() {
    if (this.groups.length === 0) {
      return undefined;
    }

    return this.groups[this.groups.length - 1];
  }

  get currentTest() {
    if (this.tests.length === 0) {
      throw new Error('No current test - start test');
    }

    return this.tests[this.tests.length - 1];
  }

  get currentStep() {
    if (this.steps.length === 0) {
      return undefined;
    }

    return this.steps[this.steps.length - 1];
  }

  startGroup(title: string) {
    if (this.groups.length === 0 && title === '') {
      return undefined;
    }
    const group = (this.currentGroup ?? this.allureRuntime).startGroup(title);
    this.groups.push(group);
    console.log(`SUITES: ${JSON.stringify(this.groups.map(t => t.name))}`);

    return group;
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
  }

  setLabel(arg: AllureTaskArgs<'setLabel'>) {
    this.currentTest.addLabel(arg.name, arg.value);
  }

  applyGroupLabels() {
    this.currentTest.addLabel(LabelName.PACKAGE, this.groups.map(t => t.name.replace(/\./g, ' ')).join('.'));
    const [parentSuite, suite, subSuite] = this.groups;

    if (this.groups.length > 0) {
      this.currentTest.addLabel(LabelName.PARENT_SUITE, parentSuite.name);
    }

    if (this.groups.length > 1) {
      this.currentTest.addLabel(LabelName.SUITE, suite.name);
    }

    if (this.groups.length > 2) {
      this.currentTest.addLabel(LabelName.SUB_SUITE, subSuite.name);
    }
  }

  startTest(arg: AllureTaskArgs<'testStarted'>) {
    const { title, fullTitle, id } = arg;
    const group = this.currentGroup ?? this.startGroup('Root suite');
    const test = group!.startTest(title);
    this.tests.push(test);
    this.currentTest.fullName = fullTitle;
    this.currentTest.historyId = getUuid(id);
    this.applyGroupLabels();
  }

  endTest(arg: AllureTaskArgs<'testEnded'>) {
    const { result } = arg;
    this.currentTest.status = result as Status; //todo
    this.currentTest.endTest();
  }

  startStep(arg: AllureTaskArgs<'stepStarted'>) {
    const { name, date } = arg;
    const executable = this.currentStep ?? this.currentTest;

    const step = executable.startStep(name, date);
    // step.description = 'sddsds ';
    // step.detailsMessage = 'sas asdetails ';
    this.steps.push(step);
  }

  endStep(arg: AllureTaskArgs<'stepEnded'>) {
    const { status, date } = arg;

    if (this.currentStep) {
      this.currentStep.status = status as Status;

      if (arg.details) {
        this.currentStep.statusDetails = { message: arg.details };
      }
      this.currentStep.endStep(date);

      this.steps.pop();
    }
  }
}
