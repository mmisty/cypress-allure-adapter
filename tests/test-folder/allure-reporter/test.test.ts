import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import type { AllureTasks } from '../../../src/plugins/allure-types';
import { Status } from '../../../src/plugins/allure-types';
import { parseAllure } from 'allure-js-parser';
import { mapSteps } from '../../cy-helper/utils';

describe('screenshot regression', () => {
  const allureTasks = require('../../../src/plugins/allure').allureTasks;
  const resultsPath = 'allure-results-jest';

  it('regression screen', async () => {
    if (existsSync(resultsPath)) {
      rmSync(resultsPath, { recursive: true });
    }
    const screenshots = `${process.cwd()}/${resultsPath}/screens/${Date.now()}`;

    if (!existsSync(screenshots)) {
      mkdirSync(screenshots, { recursive: true });
    }
    const screenPath = `${screenshots}/test.png`;
    const screenPath2 = `${screenshots}/test1.png`;
    const screenFailed = `${screenshots}/test-failure.png`;
    writeFileSync(screenPath, 'png content');
    writeFileSync(screenPath2, 'png content2');
    writeFileSync(screenFailed, 'png content failed');

    const reporter = allureTasks({
      allureAddVideoOnPass: false,
      allureResults: resultsPath,
      techAllureResults: `${resultsPath}/watch`,
      videos: 'vid',
      screenshots,
      showDuplicateWarn: false,
      isTest: false,
    }) as AllureTasks;

    await reporter.endAll({});
    await reporter.specStarted({
      spec: {
        specType: 'integration',
        name: 'not-existing.ts',
        relative: 'integration/e2e/temp/not-existing.ts',
        absolute: 'integration/e2e/temp/not-existing.ts',
      },
    });
    await reporter.endAll({});
    await reporter.hookStarted({
      title: 'before all hook',
      file: 'integration/e2e/temp/not-existing.ts',
      hookId: 'h1',
    });

    await reporter.endAll({});
    await reporter.hookEnded({
      title: '"before all" hook',
      result: Status.PASSED,
    });

    await reporter.suiteStarted({
      title: 'test screenshot',
      fullTitle: 'test screenshot',
      file: undefined,
    });
    await reporter.hookStarted({
      title: 'before all hook',
      file: undefined,
      hookId: 'h7',
    });
    await reporter.stepStarted({
      name: 'visit: mytest.com',
      date: 1692553664367,
    });
    // by cypress event after screenshot
    await reporter.fileAttachment({
      name: 'some kind attach.png',
      file: screenPath,
      type: 'image/png',
    });
    await reporter.stepEnded({ status: Status.PASSED, date: 1692554220264 });
    await reporter.hookEnded({
      title: '"before all" hook',
      result: Status.PASSED,
    });

    await reporter.hookStarted({
      title: 'before all hook',
      file: undefined,
      hookId: 'h8',
    });
    await reporter.stepStarted({ name: 'get: div', date: 1692554220269 });
    await reporter.fileAttachment({
      name: 'screen (failure)',
      file: screenFailed,
      type: 'image/png',
    });
    await reporter.hookEnded({
      title: '"before all" hook',
      result: Status.FAILED,
      details: { message: 'error' },
    });
    await reporter.testStarted({
      title: 'test fail',
      fullTitle: 'test screenshot test fail',
      id: 'r3',
      currentRetry: 0,
    });
    await reporter.testResult({
      title: 'test fail',
      id: 'r3',
      result: Status.FAILED,
      details: {
        message:
          'Timed out retrying after 4000ms' +
          'never found it.\\n\\nBecause this error ',
        trace: 'Assert',
      },
    });
    await reporter.testEnded({
      result: Status.FAILED,
      details: {
        message: 'Timed out retrying after 4000ms',
        trace: 'AssertionError: Timed out retrying after 4000ms:',
      },
    });
    await reporter.suiteEnded({});

    return;
    await reporter.afterSpec({
      results: {
        video: undefined,
        screenshots: [
          {
            screenshotId: 'm5htu',
            testId: 'r3',
            testAttemptIndex: 0,
            takenAt: '2023-08-20T17:56:59.851Z',
            path: screenPath,
            height: 590,
            width: 1000,
          },
          {
            screenshotId: 'wcjsl',
            testId: 'r3',
            testAttemptIndex: 0,
            takenAt: '2023-08-20T17:57:04.277Z',
            path: screenFailed,
            height: 590,
            width: 1280,
          },
        ],
      } as any,
    });

    // then:
    const results = parseAllure(resultsPath);
    expect(
      mapSteps(results[0].steps, t => ({ name: t.name, status: t.status })),
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
        name: "'after each' hook: Test teardown",
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
