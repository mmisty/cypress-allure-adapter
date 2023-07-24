import { execSync } from 'child_process';
import path, { basename } from 'path';
import { delay } from 'jest-test-each/dist/tests/utils/utils';
import { AllureTest } from 'allure-js-parser';
import { ExecutableItem } from 'allure-js-commons';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

jest.setTimeout(120000);

// eslint-disable-next-line jest/no-export
export const mapSteps = (steps: ExecutableItem[]): any => {
  if (steps?.length === 0) {
    return [];
  }

  return steps.map(s => {
    return { name: s.name, steps: mapSteps(s.steps) };
  });
};
// res:
// [
//  {name: 'step', steps:  }
// ]

// eslint-disable-next-line jest/no-export
export const fixResult = (results: AllureTest[]): AllureTest[] => {
  const date = Date.parse('10 Dec 2011 UTC');

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
          statusDetails: b.statusDetails?.message
            ? {
                message: b.statusDetails.message,
                trace: b.statusDetails.trace ? 'trace' : undefined,
              }
            : undefined,
        })),
        afters: r.parent?.afters?.map(b => ({
          ...b,
          steps: replaceSteps(b.steps),
          start: date,
          stop: date + 10,
          statusDetails: b.statusDetails?.message
            ? {
                message: b.statusDetails.message,
                trace: b.statusDetails.trace ? 'trace' : undefined,
              }
            : undefined,
        })),
      },
      labels: r.labels.map(l => ({
        name: l.name,
        value: l.value.replace(/\d{5,}/g, 'number'),
      })),
      steps: replaceSteps(r.steps),
      attachments: r.attachments.map(t => ({
        ...t,
        name: t.name.replace(/\d{5,}/g, 'number'), // todo check name in one test
        source: `source${path.extname(t.source)}`,
      })),
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

// eslint-disable-next-line jest/no-export
export const sortAttachments = (res: AllureTest[]) => {
  return res
    .map(t => t.attachments.sort((a, b) => (a.name < b.name ? -1 : 1)))
    .sort((a, b) => {
      return b[0].name < a[0].name ? -1 : 1;
    });
};

// eslint-disable-next-line jest/no-export
export const createResTest2 = (
  specTexts: string[],
  envConfig?: Record<string, string | undefined>,
): { watch: string; specs: string[] } => {
  const testsPath = `${process.cwd()}/integration/e2e/temp`;
  const specPaths: string[] = [];

  if (!existsSync(testsPath)) {
    mkdirSync(testsPath);
  }

  specTexts.forEach((content, i) => {
    const specPath = `${testsPath}/test_${i}_${Date.now()}.cy.ts`;
    writeFileSync(specPath, content);
    specPaths.push(specPath);
  });

  const name = basename(specPaths[0], '.test.ts');
  const testname = `${name}.cy.ts`;
  const storeResDir = `allure-results/${testname}`;

  const env = {
    allure: 'true',
    allureResults: storeResDir,
    allureResultsWatchPath: `${storeResDir}/watch`,
    allureCleanResults: 'true',
    allureSkipCommands: 'intercept',
    COVERAGE_REPORT_DIR: 'reports/coverage-cypress',
    COVERAGE: 'false',
    JEST_TEST: 'true',
    ...(envConfig || {}),
  };

  it('create results jest', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cy = require('cypress');

    const port = 40000 + Math.round(Math.random() * 25000);
    let err: Error | undefined;
    const spec = specPaths.length === 1 ? specPaths[0] : specPaths;

    try {
      process.env.DEBUG = envConfig?.DEBUG ? 'cypress-allure*' : undefined;
      console.log(env);
      await cy.run({
        spec,
        specPattern: 'integration/e2e/**/*.(cy|test|spec).ts',
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

  return {
    watch: env.allureResultsWatchPath,
    specs: specPaths.map(t => `${process.cwd()}/reports/${basename(t)}.log`),
  };
};
