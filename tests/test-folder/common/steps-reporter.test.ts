import { allureTasks } from '../../../src/plugins/allure';
import { Status } from '../../../src/plugins/allure-types';
import { parseAllure } from 'allure-js-parser';
import { mapSteps } from '../../cy-helper/utils';
import { existsSync, rmSync } from 'fs';

describe('steps', () => {
  const resultsPath = 'allure-results-jest';
  beforeEach(() => {
    if (existsSync(resultsPath)) {
      rmSync(resultsPath, { recursive: true });
    }
  });

  it('steps-end', () => {
    const reporter = allureTasks({
      allureAddVideoOnPass: false,
      allureResults: resultsPath,
      techAllureResults: `${resultsPath}/watch`,
      videos: 'vid',
      screenshots: 'scr',
      showDuplicateWarn: false,
      isTest: false,
    });

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
    reporter.stepEnded({ status: Status.PASSED, date: 1691489454565 });
    reporter.testResult({
      title: 'should subtract values',
      id: 'r5',
      result: 'failed' as Status,
      details: {
        message: 'Timed out retrying after 1000ms: expected 1 to equal 3',
        trace: 'AssertionError: Timed out retrying after 1000ms)',
      },
    });
    reporter.testEnded({
      result: 'failed' as Status,
      details: {
        message: 'Timed out retrying after 1000ms: expected 1 to equal 3',
        trace: 'AssertionErro',
      },
    });
    reporter.suiteEnded({});

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
            steps: [],
          },
        ],
      },
    ]);
  });
});
