import { execSync } from 'child_process';
import path, { basename } from 'path';
import { delay } from 'jest-test-each/dist/tests/utils/utils';
import { AllureTest } from 'allure-js-parser';
import { ExecutableItem } from 'allure-js-commons';

jest.setTimeout(120000);

// eslint-disable-next-line jest/no-export
export const fixResult = (results: AllureTest[]): AllureTest[] => {
  const date = Date.parse('10 Dec 2011');

  const replaceSteps = (steps: ExecutableItem[]): any[] => {
    if (steps.length === 0) {
      return [];
    }

    return steps.map(s => ({ ...s, start: date, stop: date + 11, steps: replaceSteps(s.steps) }));
  };

  return results.map(r => {
    return {
      ...r,
      historyId: 'no',
      uuid: 'no',
      start: date,
      stop: date + 10,
      parent: {
        ...r.parent,
        uuid: 'no',
        befores: r.parent?.befores?.map(b => ({
          ...b,
          steps: replaceSteps(b.steps),
          start: date,
          stop: date + 10,
        })),
        afters: r.parent?.afters?.map(b => ({
          ...b,
          steps: replaceSteps(b.steps),
          start: date,
          stop: date + 10,
        })),
      },
      steps: replaceSteps(r.steps),
      attachments: r.attachments.map(t => ({ ...t, source: `source${path.extname(t.source)}` })),
    };
  }) as AllureTest[];
};

// eslint-disable-next-line jest/no-export
export const createResTest = (fileName: string, envConfig?: Record<string, string | undefined>): string => {
  const cwd = process.cwd();
  beforeAll(async () => {
    await execSync('npm run build');
  });

  const name = basename(fileName, '.test.ts');
  const testname = `${name}.cy.ts`;
  const storeResDir = `allure-results/${testname}`;

  const env = {
    allure: 'true',
    allureResults: storeResDir,
    allureCleanResults: 'true',
    allureSkipCommands: 'intercept',
    COVERAGE_REPORT_DIR: 'reports/coverage-cypress',
    COVERAGE: 'false',
    ...(envConfig || {}),
  };

  it('create results', async () => {
    const g = require('fast-glob');
    const file = g.sync(`${cwd}/integration/e2e/**/${testname}`);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cy = require('cypress');
    //const spec = [`${cwd}/integration/e2e/simple-pass.cy.ts`, `${cwd}/integration/e2e/${testname}`];
    const spec = file;
    const port = 40000 + Math.round(Math.random() * 25000);
    let err: Error | undefined;

    try {
      process.env.DEBUG = envConfig?.DEBUG ? 'cypress-allure*' : undefined;
      console.log(env);
      await cy.run({
        spec,
        port,
        browser: 'chrome',
        trashAssetsBeforeRuns: true,
        env,
      });
    } catch (e) {
      err = e as Error;
    }

    await delay(2000);
    // console.log(res);

    expect(err).toBeUndefined();
  });

  return storeResDir;
};
