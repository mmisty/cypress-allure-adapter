import { Status } from 'allure-js-commons';
import { parseAllure } from 'allure-js-parser';
import { existsSync, rmSync } from 'fs';
import { mapSteps } from '@test-utils';
import type { ReporterOptions } from '@src/plugins/allure';

/**
 * Test for issue that some steps had unknown status
 * Cause: steps were not ended correctly on testResult event
 */
describe('reporter attachements', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const allureTasks = require('../../../src/plugins/allure').allureTasks;
  const resultsPath = 'allure-results-jest';

  it('should correctly add attach', async () => {
    if (existsSync(resultsPath)) {
      rmSync(resultsPath, { recursive: true });
    }

    const opts: ReporterOptions = {
      allureAddVideoOnPass: false,
      allureSkipSteps: '',
      allureResults: resultsPath,
      techAllureResults: `${resultsPath}/watch`,
      videos: 'vid',
      screenshots: 'scr',
      showDuplicateWarn: false,
      isTest: false,
    };
    const reporter = allureTasks(opts);
    const specPath = `${process.cwd()}/integration/e2e/spec name`;
    const specName = 'spec name';

    reporter.specStarted({
      spec: {
        name: specName,
        absolute: specPath,
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
    reporter.attachment({
      name: '123.txt',
      content: 'content',
      type: 'text/css',
    });
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
    reporter.screenshotAttachment({
      screenshotId: '123i',
      specName: specName,
      testId: 'r8',
      path: specPath,
      height: 100,
      width: 100,
      testFailure: true,
    });

    reporter.testEnded({
      result: 'failed' as Status,
      details: {
        message: 'Timed out retrying after 1000ms: expected 1 to equal 3',
        trace: 'AssertionErro',
      },
    });

    reporter.suiteEnded({});

    await reporter.afterSpec({ results: [] });

    const results = parseAllure(resultsPath);
    expect(
      mapSteps(results[0].steps, t => ({
        name: t.name,
        status: t.status,
        attachments: t.attachments.map(c => c.name),
      })),
    ).toEqual([
      {
        name: 'subtract',
        status: 'failed',
        attachments: [],
        steps: [
          {
            name: 'wrap: 1',
            status: 'failed',
            attachments: ['123.txt'],
            steps: [
              {
                name: 'assert',
                status: 'failed',
                steps: [],
                attachments: [],
              },
            ],
          },
        ],
      },
      {
        name: '"after each" hook: Test teardown',
        status: 'passed',
        attachments: [],
        steps: [
          {
            name: 'log: Some teardown step',
            status: 'passed',
            steps: [],
            attachments: [],
          },
        ],
      },
    ]);
  });
});
