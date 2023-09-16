import { basename } from 'path';
import { AllureReporter3 } from '../../../src/plugins/allure-reporter-3';
import { AllureTest } from 'allure-js-parser';
import { existsSync, rmSync } from 'fs';
import { Status } from '../../../src/plugins/allure-types';

describe('create results', () => {
  const allureResults = `allure-results-reporter2/${basename(__filename)}`;
  let reporter: AllureReporter3;
  // let res: AllureTest[];

  beforeEach(() => {
    if (existsSync(allureResults)) {
      rmSync(allureResults, { recursive: true });
    }
    reporter = new AllureReporter3({ allureResults });
  });

  it('one group 2 tests', () => {
    reporter.startGroup({ title: 'PArent', fullTitle: 'any' });
    reporter.startTest({
      title: 'Hello 1',
      id: '1',
      fullTitle: 'Hello 1',
      date: 100,
    });
    reporter.endTest({ result: Status.PASSED, date: 110 });

    reporter.startTest({
      title: 'Hello 2',
      id: '2',
      fullTitle: 'Hello 2',
      date: 100,
    });
    reporter.endTest({
      result: Status.FAILED,
      details: { message: 'ERROR IN TEST' },
      date: 110,
    });
    reporter.endGroup();
  });

  it('one group 2 tests (steps)', () => {
    reporter.startGroup({ title: 'PArent', fullTitle: 'any' });
    reporter.startTest({
      title: 'Hello 1',
      id: '1',
      fullTitle: 'Hello 1',
      date: 100,
    });
    reporter.startStep({ name: 'step test' });
    reporter.endStep({ status: Status.PASSED });
    reporter.endTest({ result: Status.PASSED, date: 110 });

    reporter.startTest({
      title: 'Hello 2',
      id: '2',
      fullTitle: 'Hello 2',
      date: 100,
    });
    reporter.startStep({ name: 'step test' });
    reporter.startStep({ name: 'sub step test' });
    reporter.endStep({ status: Status.PASSED });
    reporter.endStep({ status: Status.PASSED });

    reporter.startStep({ name: 'not finished test' });

    reporter.endTest({
      result: Status.FAILED,
      details: { message: 'ERROR IN TEST' },
      date: 110,
    });
    reporter.endGroup();
  });

  it('one group global hooks 2 tests (steps)', () => {
    reporter.hookStarted({ title: 'before all' });
    reporter.hookEnded({ title: 'before all', result: Status.PASSED });

    reporter.startGroup({ title: 'PArent', fullTitle: 'any' });

    reporter.hookStarted({ title: 'before all 2' });
    reporter.hookEnded({ title: 'before all 2', result: Status.PASSED });

    reporter.startTest({
      title: 'Hello 1',
      id: '1',
      fullTitle: 'Hello 1',
      date: 100,
    });

    reporter.hookStarted({ title: 'before each 1' });
    reporter.startStep({ name: 'before each test' });
    reporter.endStep({ status: Status.PASSED });

    reporter.startStep({ name: 'before each test step 2' });
    reporter.hookEnded({ title: 'before each 1', result: Status.PASSED });

    reporter.hookStarted({ title: 'before each 2' });
    reporter.hookEnded({ title: 'before each 2', result: Status.PASSED });

    reporter.startStep({ name: 'step test' });
    reporter.endStep({ status: Status.PASSED });
    reporter.endTest({ result: Status.PASSED, date: 110 });

    reporter.startTest({
      title: 'Hello 2',
      id: '2',
      fullTitle: 'Hello 2',
      date: 100,
    });
    reporter.startStep({ name: 'step test' });
    reporter.startStep({ name: 'sub step test' });
    reporter.endStep({ status: Status.PASSED });
    reporter.endStep({ status: Status.PASSED });

    reporter.startStep({ name: 'not finished test' });

    reporter.endTest({
      result: Status.FAILED,
      details: { message: 'ERROR IN TEST' },
      date: 110,
    });
    reporter.endGroup();
  });
});
