import { AllureReporter3 } from '../../../src/plugins/allure-reporter-3';
import { Status } from '../../../src/plugins/allure-types';
import { existsSync, rmSync } from 'fs';
import { parseAllureSorted, selectMap } from '../../cy-helper/utils';

describe('reporter', () => {
  const allureResults = 'allure-results-reporter2';
  let reporter: AllureReporter3;

  beforeEach(() => {
    if (existsSync(allureResults)) {
      rmSync(allureResults, { recursive: true });
    }
    reporter = new AllureReporter3({
      allureResults,
      techAllureResults: allureResults,
      videos: '',
      screenshots: '',
      isTest: false,
    });
  });

  it('should start one group', () => {
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });

    expect(reporter.currentGroup?.name).toEqual('Hello');
  });

  it('should start 2 groups', () => {
    const groups: (string | undefined)[] = [];
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });
    groups.push(reporter.currentGroup?.name);
    reporter.startGroup({ title: 'Sub', fullTitle: 'any' });
    groups.push(reporter.currentGroup?.name);

    expect(groups).toEqual(['Hello', 'Sub']);
  });

  it('should end group', () => {
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });
    reporter.startGroup({ title: 'Sub', fullTitle: 'any' });

    reporter.endGroup();
    expect(reporter.currentGroup?.name).toEqual('Hello');
  });

  it('should start test', () => {
    const groups: (string | undefined)[] = [];
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });
    groups.push(reporter.currentGroup?.name);
    reporter.startGroup({ title: 'Sub', fullTitle: 'any' });
    groups.push(reporter.currentGroup?.name);
    reporter.startTest({ title: 'Test', id: '1', fullTitle: 'any' });
    groups.push((reporter.currentTest as any)?.info?.name);

    expect(groups).toEqual(['Hello', 'Sub', 'Test']);
  });

  it('should end test', () => {
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });
    reporter.startGroup({ title: 'Sub', fullTitle: 'any' });
    reporter.startTest({ title: 'Test', id: '1', fullTitle: 'any' });
    reporter.endTest({ result: Status.PASSED });
    reporter.endGroup();
    reporter.endGroup();

    expect(reporter.currentTest?.name).toEqual(undefined);
  });

  it('start several tests - check full tests', () => {
    reporter.startGroup({ title: 'PArent', fullTitle: 'any' });
    reporter.startTest({ title: 'Hello 1', id: '1', fullTitle: 'Hello 1' });
    reporter.endTest({ result: Status.PASSED });

    reporter.startTest({ title: 'Hello 2', id: '2', fullTitle: 'Hello 2' });
    reporter.endTest({
      result: Status.FAILED,
      details: { message: 'ERROR IN TEST' },
    });
    reporter.endGroup();

    // then

    const res = parseAllureSorted(allureResults);

    expect(
      selectMap(
        res,
        'name',
        'fullName',
        'status',
        'statusDetails',
        'labels',
        'steps',
      ),
    ).toEqual([
      {
        statusDetails: {},
        labels: ['parentSuite: "PArent"'],
        steps: [],
        fullName: 'Hello 1',
        name: 'Hello 1',
        status: 'passed',
      },
      {
        statusDetails: {
          message: 'ERROR IN TEST',
        },
        labels: ['parentSuite: "PArent"'],
        name: 'Hello 2',
        fullName: 'Hello 2',
        status: 'failed',
        steps: [],
      },
    ]);
  });

  it('should start global hook', () => {
    reporter.hookStarted({ title: 'before all hook' });
    reporter.startStep({ name: 'some hook step' });
    reporter.endStep({ status: Status.PASSED });
    reporter.hookEnded({ title: 'before all hook', result: Status.PASSED });

    reporter.hookStarted({ title: 'before all hook 2' });
    reporter.hookEnded({ title: 'before all hook 2', result: Status.PASSED });

    reporter.startGroup({ title: 'PArent', fullTitle: 'any' });

    reporter.hookStarted({ title: 'before all hook 3 ' });
    reporter.hookEnded({ title: 'before all hook 3', result: Status.FAILED });

    reporter.startGroup({ title: 'PArent 22', fullTitle: 'any' });

    reporter.hookStarted({ title: 'before all hook 4' });
    reporter.hookEnded({ title: 'before all hook 4', result: Status.FAILED });

    reporter.startTest({ title: 'Hello', id: '1', fullTitle: 'Hello' });
    reporter.startStep({ name: 'some step' });
    reporter.startStep({ name: 'some nested step' });
    reporter.endStep({ status: Status.PASSED });
    reporter.endStep({ status: Status.PASSED });
    reporter.endTest({ result: Status.PASSED });

    reporter.endGroup(); // parent 22

    reporter.startTest({
      title: 'Test other',
      id: '1',
      fullTitle: 'Test other',
    });
    reporter.endTest({ result: Status.PASSED });

    reporter.endGroup();
    console.log(reporter.printList());
  });
});
