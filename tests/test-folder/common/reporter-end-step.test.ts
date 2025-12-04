import { parseAllure } from 'allure-js-parser';
import { existsSync, rmSync } from 'fs';
import { mapSteps } from '@test-utils';
import type { ReporterOptions } from '@src/plugins/allure';
import { AllureTasks, Status } from '@src/plugins/allure-types';
import { AllureTaskClient } from '@src/plugins/allure-task-client';

/**
 * Test for issues with ending steps
 */
describe('reporter - end step', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const allureTasks = require('../../../src/plugins/allure').allureTasks;
  const resultsPath = 'allure-results-jest';
  const resultsPathWatch = `${resultsPath}/watch`;
  let reporter: AllureTasks;
  let client: AllureTaskClient;

  const opts: ReporterOptions = {
    allureAddVideoOnPass: false,
    allureSkipSteps: '',
    allureResults: resultsPath,
    techAllureResults: resultsPathWatch,
    videos: 'vid',
    screenshots: 'scr',
    showDuplicateWarn: false,
    isTest: false,
  };

  beforeEach(async () => {
    // Use local mode client for tests (no separate process)
    client = new AllureTaskClient('remote');
    await client.start();
    reporter = allureTasks(opts, client);

    if (existsSync(resultsPath)) {
      rmSync(resultsPath, { recursive: true });
    }
  });

  const stepsBefore = () => {
    reporter.specStarted({
      spec: {
        name: 'spec name',
        absolute: `${process.cwd()}/integration/e2e/spec name`,
        relative: 'path',
      },
    });
    reporter.suiteStarted({
      title: 'mult - divide',
      fullTitle: 'calculator mult - divide',
    });
    reporter.testStarted({
      title: 'should multiply values',
      fullTitle: 'calculator mult - divide should multiply values',
      id: 'r8',
      currentRetry: 0,
    });
  };

  const stepsAfter = async () => {
    reporter.suiteEnded({});
    await reporter.afterSpec({ results: { spec: { relative: '123' } } } as any);
    await reporter.waitAllFinished({});
  };

  it('should mark parent as broken when children have errors', async () => {
    stepsBefore();
    reporter.stepStarted({ name: 'subtract', date: 1691489454559 });
    reporter.stepStarted({ name: 'some failure', date: 1691489454565 });
    reporter.stepEnded({
      status: Status.FAILED,
      details: { message: 'UNCAUGHT' },
      date: 1691489454566,
    });
    reporter.stepEnded({ status: Status.PASSED, date: 1691489454567 });
    reporter.testResult({
      title: 'should subtract values',
      id: 'r5',
      result: Status.PASSED,
    });

    reporter.testEnded({ result: Status.PASSED });
    await stepsAfter();

    const results = parseAllure(resultsPathWatch, { logError: false });

    expect(
      mapSteps(results[0].steps, t => ({
        name: t.name,
        status: t.status,
        statuDetails: t.statusDetails,
      })),
    ).toEqual([
      {
        name: 'subtract',
        status: 'broken',
        statuDetails: {},
        steps: [
          {
            name: 'some failure',
            status: 'failed',
            statuDetails: {
              message: 'UNCAUGHT',
            },
            steps: [],
          },
        ],
      },
    ]);
  });

  it('should set status for child step when unknown', async () => {
    stepsBefore();
    reporter.stepStarted({ name: 'subtract', date: 1691489454559 });
    reporter.stepStarted({ name: 'unknown step', date: 1691489454565 });
    reporter.stepEnded({ status: 'unknown' as Status, date: 1691489454566 });
    reporter.stepEnded({ status: Status.PASSED, date: 1691489454567 });
    reporter.testResult({
      title: 'should subtract values',
      id: 'r5',
      result: Status.PASSED,
    });

    reporter.testEnded({ result: Status.PASSED });

    await stepsAfter();

    const results = parseAllure(resultsPathWatch, { logError: false });
    expect(
      mapSteps(results[0].steps, t => ({
        name: t.name,
        status: t.status,
        statuDetails: t.statusDetails,
      })),
    ).toEqual([
      {
        name: 'subtract',
        status: 'passed',
        statuDetails: {},
        steps: [
          {
            name: 'unknown step',
            status: 'passed',
            statuDetails: {
              message: 'Result: unknown',
            },
            steps: [],
          },
        ],
      },
    ]);
  });

  it('should not set status for child step when other than unknown', async () => {
    stepsBefore();
    reporter.stepStarted({ name: 'subtract', date: 1691489454559 });
    reporter.stepStarted({ name: 'broken step', date: 1691489454565 });
    reporter.stepEnded({ status: 'broken' as Status, date: 1691489454566 });
    reporter.stepEnded({ status: Status.PASSED, date: 1691489454567 });
    reporter.testResult({
      title: 'should subtract values',
      id: 'r5',
      result: Status.PASSED,
    });

    reporter.testEnded({ result: Status.PASSED });

    await stepsAfter();

    const results = parseAllure(resultsPathWatch, { logError: false });
    expect(
      mapSteps(results[0].steps, t => ({
        name: t.name,
        status: t.status,
        statuDetails: t.statusDetails,
      })),
    ).toEqual([
      {
        name: 'subtract',
        status: 'broken',
        statuDetails: {},
        steps: [
          {
            name: 'broken step',
            status: 'broken',
            statuDetails: {},
            steps: [],
          },
        ],
      },
    ]);
  });
});
