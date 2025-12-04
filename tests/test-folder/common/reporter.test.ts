import { Status } from 'allure-js-commons';
import { parseAllure } from 'allure-js-parser';
import { existsSync, rmSync } from 'fs';
import { mapSteps } from '@test-utils';
import type { ReporterOptions } from '@src/plugins/allure';
import { AllureTaskClient } from '@src/plugins/allure-task-client';

/**
 * Test for issue that some steps had unknown status
 * Cause: steps were not ended correctly on testResult event
 */
describe('reporter', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const allureTasks = require('../../../src/plugins/allure').allureTasks;
  const resultsPath = 'allure-results-jest';
  const resultsPathWatch = `${resultsPath}/watch`;
  let client: AllureTaskClient;

  beforeEach(async () => {
    client = new AllureTaskClient('remote');
    await client.start();
  });

  afterEach(async () => {
    await client.stop();
  });

  it('should correctly end all steps', async () => {
    if (existsSync(resultsPath)) {
      rmSync(resultsPath, { recursive: true });
    }

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

    const reporter = allureTasks(opts, client);

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
    reporter.stepStarted({ name: 'subtract', date: 1691489454559 });
    reporter.stepStarted({ name: 'wrap: 1', date: 1691489454565 });
    reporter.step({ name: 'assert', date: 1691489454565 });
    reporter.testResult({
      title: 'should subtract values',
      id: 'r5',
      result: 'failed' as Status,
      details: {
        message: 'Timed out retrying after 1000ms: expected 1 to equal 3',
        trace: 'AssertionError: Timed out retrying after 1000ms)',
      },
    });
    reporter.hookStarted({
      title: '"after each" hook: Test teardown',
      hookId: 'h1',
    });
    reporter.stepStarted({
      name: 'log: Some teardown step',
      date: 1691492869572,
    });
    reporter.stepEnded({ status: 'passed' as Status, date: 1691492869574 });
    reporter.hookEnded({
      title: '"after each" hook: Test teardown',
      result: 'passed' as Status,
    });

    reporter.testEnded({
      result: 'failed' as Status,
      details: {
        message: 'Timed out retrying after 1000ms: expected 1 to equal 3',
        trace: 'AssertionError',
      },
    });
    reporter.suiteEnded({});
    await reporter.afterSpec({ results: { spec: { relative: '123' } } } as any);
    await reporter.waitAllFinished();

    const results = parseAllure(resultsPathWatch, { logError: false });
    expect(
      mapSteps(results[0]?.steps ?? [], t => ({
        name: t.name,
        status: t.status,
      })),
    ).toEqual([
      {
        name: 'subtract',
        status: 'failed',
        steps: [
          {
            name: 'wrap: 1',
            status: 'failed',
            steps: [
              {
                name: 'assert',
                status: 'failed',
                steps: [],
              },
            ],
          },
        ],
      },
      {
        name: '"after each" hook: Test teardown',
        status: 'passed',
        steps: [
          {
            name: 'log: Some teardown step',
            status: 'passed',
            steps: [],
          },
        ],
      },
    ]);
  });
});
