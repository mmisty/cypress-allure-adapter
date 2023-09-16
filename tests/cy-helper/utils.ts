// eslint-disable jest/no-export
import { execSync } from 'child_process';
import path, { basename } from 'path';
import { delay } from 'jest-test-each/dist/tests/utils/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { ExecutableItem } from 'allure-js-commons';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { parseBoolean } from 'cypress-redirect-browser-log/utils/functions';

jest.setTimeout(120000);

// eslint-disable-next-line jest/no-export
export const sortBy = <T>(fn: (t: AllureTest) => T) => {
  return (a: AllureTest, b: AllureTest) => {
    const resa = fn(a);
    const resb = fn(b);

    if (resa < resb) {
      return -1;
    }

    return 1;
  };
};

// eslint-disable-next-line jest/no-export
export const selectItems = <T>(...keys: (keyof T)[]) => {
  return (t: T) => {
    const res = {} as any;
    keys.forEach(k => {
      res[k] = t[k];
    });

    // todo only keys from input
    return res as { [key in keyof AllureTest]: any };
  };
};

// eslint-disable-next-line jest/no-export
export const selectMap = <T>(input: T[], ...keys: (keyof T)[]) => {
  return input.map(t => {
    const res = {} as any;
    keys.forEach(k => {
      if (k === 'labels') {
        res[k] = (t[k] as any[]).map(t => `${t.name}: "${t.value}"`);

        return;
      }

      res[k] = t[k];
    });

    // todo only keys from input
    return res as { [key in keyof T]: any };
  });
};

// eslint-disable-next-line jest/no-export
export const parseAllureSorted = (allureResults: string) => {
  return parseAllure(allureResults).sort(sortBy(a => a.fullName));
};

// eslint-disable-next-line jest/no-export
export const mapSteps = <T>(
  steps: ExecutableItem[],
  map?: (m: ExecutableItem) => T,
): (T & any)[] => {
  if (steps?.length === 0) {
    return [];
  }

  return steps.map(s => {
    const obj = map ? map(s) : { name: s.name };

    return { ...obj, steps: mapSteps(s.steps, map) };
  });
};

// eslint-disable-next-line jest/no-export
export const fixResult = (results: AllureTest[]): AllureTest[] => {
  const date = Date.parse('10 Dec 2011 UTC');

  const replaceSteps = (steps: ExecutableItem[]): any[] => {
    if (steps.length === 0) {
      return [];
    }

    return steps.map(s => ({
      ...s,
      start: date,
      stop: date + 11,
      steps: replaceSteps(s.steps),
    }));
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
export const createResTest = (
  fileName: string,
  envConfig?: Record<string, string | undefined>,
): string => {
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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

      await cy.run({
        spec,
        port,
        browser: 'chrome',
        trashAssetsBeforeRuns: true,
        env,
        video: true,
      });
    } catch (e) {
      err = e as Error;
    }

    await delay(2000);

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
export const checkCyResults = (
  res:
    | CypressCommandLine.CypressRunResult
    | CypressCommandLine.CypressFailedRunResult
    | undefined,
  expected: Partial<
    | CypressCommandLine.CypressRunResult
    | CypressCommandLine.CypressFailedRunResult
  >,
) => {
  expect(res).toEqual(expect.objectContaining(expected));
};

// eslint-disable-next-line jest/no-export
export const createResTest2 = (
  specTexts: string[],
  envConfig?: Record<string, string | undefined>,
): {
  watch: string;
  specs: string[];
  result: {
    res:
      | CypressCommandLine.CypressRunResult
      | CypressCommandLine.CypressFailedRunResult
      | undefined;
  };
} => {
  const result: {
    res:
      | CypressCommandLine.CypressRunResult
      | CypressCommandLine.CypressFailedRunResult
      | undefined;
  } = {
    res: undefined,
  };
  const testsPath = `${process.cwd()}/integration/e2e/temp`;
  const specPaths: string[] = [];

  if (!existsSync(testsPath)) {
    mkdirSync(testsPath);
  }

  specTexts.forEach((content, i) => {
    const specPath = `${testsPath}/test_${i}_${Date.now()}.cy.ts`;
    writeFileSync(specPath, content);
    specPaths.push(specPath);
    const err = new Error('File path');
    // const st = err.stack?.replace('Error: File path', '').split('\n');
    // const pathRel = path.relative(process.cwd(), specPath);
    err.stack = `\tat ${specPath}:1:1\n${err.stack?.replace(
      'Error: File path',
      '',
    )}`.replace(/\n\n/g, '\n');
    console.log(err);
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
    COVERAGE: `${process.env.COVERAGE === 'true'}`,
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
      process.env.COVERAGE_REPORT_DIR = 'reports/coverage-cypress';

      result.res = await cy.run({
        spec,
        specPattern: 'integration/e2e/**/*.(cy|test|spec).ts',
        port,
        browser: 'chrome',
        trashAssetsBeforeRuns: true,
        env,
        quiet: process.env.CI === 'true',
        video: parseBoolean(envConfig?.video ?? `${true}`),
      });
    } catch (e) {
      err = e as Error;
    }

    await delay(2000);

    expect(err).toBeUndefined();
  });

  return {
    watch: env.allureResultsWatchPath,
    specs: specPaths.map(
      t => `${process.cwd()}/reports/test-events/${basename(t)}.log`,
    ),
    result: result,
  };
};

// eslint-disable-next-line jest/no-export
export const whenCoverage = <T>(...res: T[]): T[] =>
  process.env.COVERAGE === 'true' ? res : [];
// eslint-disable-next-line jest/no-export
export const whenNoCoverage = <T>(...res: T[]): T[] =>
  process.env.COVERAGE !== 'true' ? res : [];
// eslint-disable-next-line jest/no-export
export const covergeAfterAllEvent = [
  'mocha: hook: "after all" hook: collectBackendCoverage',
  'mocha: hook end: "after all" hook: collectBackendCoverage',
  'mocha: hook: "after all" hook: mergeUnitTestCoverage',
  'mocha: hook end: "after all" hook: mergeUnitTestCoverage',
  'mocha: hook: "after all" hook: generateReport',
  'mocha: hook end: "after all" hook: generateReport',
];
// eslint-disable-next-line jest/no-export
export const coverageAfterEachEvent = [
  'mocha: hook: "after each" hook',
  'mocha: hook end: "after each" hook',
];
// eslint-disable-next-line jest/no-export
export const coverageBeforeAll = [
  'mocha: hook: "before all" hook',
  'mocha: hook end: "before all" hook',
];

// eslint-disable-next-line jest/no-export
export const coverageBeforeEachEvent = [
  'mocha: hook: "before each" hook',
  'mocha: hook end: "before each" hook',
];
// eslint-disable-next-line jest/no-export
export const covergeAfterAll = [
  {
    attachments: [],
    name: '"after all" hook: collectBackendCoverage',
    parameters: [],
    stage: 'finished',
    start: 1323475200000,
    status: 'passed',
    steps: [],
    stop: 1323475200010,
  },
  {
    attachments: [],
    name: '"after all" hook: mergeUnitTestCoverage',
    parameters: [],
    stage: 'finished',
    start: 1323475200000,
    status: 'passed',
    steps: [
      {
        attachments: [],
        name: 'log: Saving code coverage for **unit** `[@cypress/code-coverage]`',
        parameters: [],
        stage: 'finished',
        start: 1323475200000,
        status: 'passed',
        statusDetails: {},
        steps: [],
        stop: 1323475200011,
      },
    ],
    stop: 1323475200010,
  },
  {
    attachments: [],
    name: '"after all" hook: generateReport',
    parameters: [],
    stage: 'finished',
    start: 1323475200000,
    status: 'passed',
    steps: [
      {
        attachments: [],
        name: 'Coverage: Generating report [@cypress/code-coverage]',
        parameters: [],
        stage: 'finished',
        start: 1323475200000,
        status: 'passed',
        statusDetails: {},
        steps: [],
        stop: 1323475200011,
      },
    ],
    stop: 1323475200010,
  },
];
// eslint-disable-next-line jest/no-export
export const covergeBeforeAll = [
  {
    attachments: [],
    name: '"before all" hook',
    parameters: [],
    stage: 'finished',
    start: 1323475200000,
    status: 'passed',
    steps: [
      {
        attachments: [],
        name: 'Coverage: Reset [@cypress/code-coverage]',
        parameters: [],
        stage: 'finished',
        start: 1323475200000,
        status: 'passed',
        statusDetails: {},
        steps: [],
        stop: 1323475200011,
      },
    ],
    stop: 1323475200010,
  },
];
