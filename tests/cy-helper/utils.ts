import { execSync } from 'child_process';
import path, { basename } from 'path';
import { delay } from 'jest-test-each/dist/tests/utils/utils';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';
import { StepResult } from 'allure-js-commons';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parseBoolean } from 'cypress-redirect-browser-log/utils/functions';
import { AllureHook, Parent } from 'allure-js-parser/types';
import { globSync } from 'fast-glob';
import { commonConfig } from '../../cypress.config';
import expect from 'expect';

jest.setTimeout(360000);

// eslint-disable-next-line jest/no-export
export const mapSteps = <T>(
  steps: StepResult[],
  map?: (m: StepResult) => T,
  filter?: (m: StepResult) => boolean,
): (T & any)[] => {
  if (steps?.length === 0) {
    return [];
  }

  return steps
    .filter(s => {
      return filter ? filter(s) : true;
    })
    .map(s => {
      const obj = map ? map(s) : { name: s.name };

      return { ...obj, steps: mapSteps(s.steps, map, filter) };
    });
};

const fixAttachName = (spec: string) => {
  return spec.replace(/\d{5,}/g, 'number').replace(/_\d_/, '_0_');
};

// eslint-disable-next-line jest/no-export
export const fixResult = (results: AllureTest[]): AllureTest[] => {
  const date = Date.parse('10 Dec 2011 UTC');

  const replaceSteps = (steps: StepResult[]): any[] => {
    if (!steps || steps.length === 0) {
      return [];
    }

    return steps.map(s => ({
      ...s,
      start: date,
      stop: date + 11,
      attachments: s.attachments.map(t => ({
        ...t,
        name: fixAttachName(t.name),
        source: `source${path.extname(t.source)}`,
      })),
      steps: replaceSteps(s.steps),
    }));
  };

  const fixParent = (parent: Parent | undefined) => {
    if (parent) {
      return {
        ...parent,
        parent: fixParent(parent.parent),
        uuid: 'no',
        befores: parent?.befores?.map(b => ({
          ...b,
          steps: replaceSteps(b.steps),
          start: date,
          stop: date + 10,
          attachments: b.attachments.map(t => ({
            ...t,
            name: fixAttachName(t.name),
            source: `source${path.extname(t.source)}`,
          })),
          statusDetails: b.statusDetails?.message
            ? {
                message: b.statusDetails.message,
                trace: b.statusDetails.trace ? 'trace' : undefined,
              }
            : undefined,
        })),
        afters: parent?.afters?.map(b => ({
          ...b,
          steps: replaceSteps(b.steps),
          start: date,
          stop: date + 10,
          attachments: b.attachments.map(t => ({
            ...t,
            name: fixAttachName(t.name),
            source: `source${path.extname(t.source)}`,
          })),
          statusDetails: b.statusDetails?.message
            ? {
                message: b.statusDetails.message,
                trace: b.statusDetails.trace ? 'trace' : undefined,
              }
            : undefined,
        })),
      };
    }

    return undefined;
  };

  return results
    .sort((a, b) =>
      !!a && !!b && a.start && b.start && a.start < b.start ? -1 : 1,
    )
    .map(r => {
      return {
        ...r,
        historyId: 'no',
        uuid: 'no',
        start: date,
        stop: date + 10,
        parent: fixParent(r.parent),
        labels: r.labels.map(l => ({
          name: l.name,
          value: l.value.replace(/\d{5,}/g, 'number'),
        })),
        steps: replaceSteps(r.steps),
        attachments: r.attachments.map(t => ({
          ...t,
          name: fixAttachName(t.name), // todo check name in one test
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
      process.env.DEBUG = envConfig?.DEBUG ? 'cypress-allure*' : '';

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
    .map(t =>
      t.attachments.sort((a, b) =>
        a.name && b.name && a.name < b.name ? -1 : 1,
      ),
    )
    .sort((a, b) => {
      return a?.[0].name && b?.[0].name && b[0].name < a[0].name ? -1 : 1;
    });
};

// eslint-disable-next-line jest/no-export
export const labelsForTest = (res: AllureTest[], filterLabels?: string[]) => {
  return res
    .map(t => ({ labels: t.labels, name: t.name }))
    .sort((a, b) => ((a as any).name < (b as any).name ? -1 : 1))
    .map(t => ({
      ...t,
      labels: t.labels.filter(x =>
        filterLabels && filterLabels.length > 0
          ? filterLabels.includes(x.name)
          : true,
      ),
    }));
};

// eslint-disable-next-line jest/no-export
export const fullStepAttachment = (
  res: AllureTest[],
  mapStep?: (m: StepResult) => any,
  options?: { noAddParents?: boolean },
) => {
  const parents = res
    .map(x => ({
      ...x,
      parent: undefined,
      parents: getParentsArray(x),
    }))
    .sort((z1, z2) => (z1.name && z2.name && z1.name < z2.name ? -1 : 1));
  const skipItems = ['generatereport', 'coverage'];

  const mapItem = (items: undefined | AllureHook[] | AllureTest[]) => {
    return (
      items
        ?.map(t => ({
          name: t.name,
          status: t.status,
          attachments: t.attachments
            .map(t => ({
              ...t,
              name: fixAttachName(t.name),
              source: `source${path.extname(t.source)}`,
            }))
            .sort((z1, z2) =>
              z1.name && z2.name && z1.name < z2.name ? -1 : 1,
            ),
          steps: mapSteps(t.steps, mapStep).filter(x =>
            skipItems.every(y => x.name?.toLowerCase().indexOf(y) === -1),
          ),
        }))
        .filter(x =>
          skipItems.every(y => x.name?.toLowerCase().indexOf(y) === -1),
        )
        .sort((z1, z2) => (z1.name && z2.name && z1.name < z2.name ? -1 : 1)) ??
      []
    );
  };

  const full = parents
    .map(t => ({
      name: t.name,
      status: t.status,
      attachments: t.attachments.sort((z1, z2) =>
        z1.name && z2.name && z1.name < z2.name ? -1 : 1,
      ),
      steps: mapSteps(t.steps, mapStep).filter(x =>
        skipItems.every(y => x.name?.toLowerCase().indexOf(y) === -1),
      ),
      ...(!options?.noAddParents
        ? {
            parents: t.parents?.map(x => ({
              suiteName: x.name,
              befores: mapItem(x.befores)
                .filter(z =>
                  skipItems.every(y => z.name.toLowerCase().indexOf(y) === -1),
                )
                .sort((z1, z2) =>
                  z1.name && z2.name && z1.name < z2.name ? -1 : 1,
                ),
              afters: mapItem(x.afters)
                .filter(z =>
                  skipItems.every(y => z.name.toLowerCase().indexOf(y) === -1),
                )
                .sort((z1, z2) =>
                  z1.name && z2.name && z1.name < z2.name ? -1 : 1,
                ),
            })),
          }
        : {}),
    }))
    .filter(x => skipItems.every(y => x.name?.toLowerCase().indexOf(y) === -1));

  return full;
};

// eslint-disable-next-line jest/no-export
export const fullStepMap = (
  res: AllureTest,
  mapStep?: (m: StepResult) => any,
  filterStep?: (m: StepResult) => boolean,
) => {
  const skipItems = ['generatereport', 'coverage'];

  return mapSteps(res.steps as StepResult[], mapStep, z =>
    skipItems.every(y => z.name?.toLowerCase().indexOf(y) === -1) && filterStep
      ? filterStep(z)
      : true,
  );
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
export const readWithRetry = (path: string, attempt = 0) => {
  try {
    return readFileSync(path);
  } catch (e) {
    if (attempt < 30) {
      return readWithRetry(path, attempt + 1);
    }
  }
};

// eslint-disable-next-line jest/no-export
export const eventsForFile = (res: Result, fileName: string): string[] => {
  return readWithRetry(res.specs.filter(x => x.indexOf(fileName) !== -1)[0])
    ?.toString()
    .split('\n')
    .filter(t => t !== '');
};

type Result = {
  watch: string;
  specs: string[];
  result: {
    res:
      | CypressCommandLine.CypressRunResult
      | CypressCommandLine.CypressFailedRunResult
      | undefined;
  };
};

// eslint-disable-next-line jest/no-export
export const createResTest2 = (
  specTexts: string[],
  envConfig?: Record<string, string | undefined>,
  shouldBeResults?: boolean,
): Result => {
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
    const pathRel = path.relative(process.cwd(), specPath);
    err.stack = `\tat ${specPath}:1:1\n${err.stack?.replace(
      'Error: File path',
      '',
    )}`.replace(/\n\n/g, '\n');
    console.log(`running spec: ${pathRel}`);
  });

  const specs = specPaths.map(
    t => `${process.cwd()}/reports/test-events/${basename(t)}.log`,
  );

  const name = basename(specPaths[0], '.test.ts');
  const testname = `${name}.cy.ts`;
  const storeResDir = `allure-results/${testname}`;

  // ability to set allureResultsWatchPath from test to undefined or to <storeResDir>
  let definedWatchPath: string | undefined = `${storeResDir}/watch`;

  if (
    envConfig &&
    Object.getOwnPropertyNames(envConfig).includes('allureResultsWatchPath')
  ) {
    if (envConfig?.allureResultsWatchPath === undefined) {
    } else {
      definedWatchPath = envConfig?.allureResultsWatchPath?.replace(
        '<storeResDir>',
        storeResDir,
      );
      delete envConfig?.allureResultsWatchPath;
    }
  }

  const env = {
    allure: 'true',
    allureResults: storeResDir,
    allureResultsWatchPath: definedWatchPath,
    allureCleanResults: 'true',
    allureSkipCommands: 'intercept',
    COVERAGE: `${process.env.COVERAGE}` === 'true',
    JEST_TEST: 'true',
    ...(envConfig || {}),
  };

  it('create results jest', async () => {
    jest.retryTimes(1);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cy = require('cypress');

    const port = 40000 + Math.round(Math.random() * 25000);
    let err: Error | undefined;
    const spec = specPaths.length === 1 ? specPaths[0] : specPaths;

    process.env.DEBUG = envConfig?.DEBUG ? 'cypress-allure*' : '';
    process.env.COVERAGE_REPORT_DIR = 'reports/coverage-cypress';

    const checkFilesExist = retries => {
      return new Promise((resolve, reject) => {
        const attempt = remainingRetries => {
          if (!specs.every(p => existsSync(p))) {
            console.log(
              `Not all files were written: attempt ${retries - remainingRetries + 1}`,
            );

            if (remainingRetries > 0) {
              return delay(1000)
                .then(() => attempt(remainingRetries - 1))
                .catch(reject);
            } else {
              return reject(
                new Error('Files are still missing after all retries'),
              );
            }
          }
          resolve(true);
        };

        attempt(retries);
      });
    };
    const video = parseBoolean(envConfig?.video ?? `${true}`);
    // todo fix video
    console.log(`video:${video}`);
    const config = commonConfig;

    if (!video) {
      config.video = false;
    }

    return cy
      .run({
        spec: spec as string,
        specPattern: 'integration/e2e/**/*.(cy|test|spec).ts',
        port,
        browser: 'chrome',
        env,
        quiet: `${process.env.QUIET}` === 'true',
        config: {
          ...config,
          trashAssetsBeforeRuns: true,
        },
      })
      .catch(e => {
        err = e as Error;
      })
      .then(cyResult => {
        result.res = cyResult;
      })
      .then(() => {
        expect(err).toBeUndefined();

        if (!specs.every(p => existsSync(p))) {
          console.log('Not all files were written');

          return delay(1000);
        }
      })
      .then(() => {
        if (shouldBeResults !== false) {
          return checkFilesExist(10);
        }
      });
  });

  afterEach(() => {
    // to investigate issue with missing
    if (specs?.some(p => existsSync(p))) {
      specs.forEach(s => {
        const content = readFileSync(s);
        console.log(content.toString());
      });
    }
  });

  return {
    watch: env.allureResultsWatchPath ?? storeResDir,
    specs: specs,
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
      // {
      //   attachments: [],
      //   name: 'Coverage: Generating report [@cypress/code-coverage]',
      //   parameters: [],
      //   stage: 'finished',
      //   start: 1323475200000,
      //   status: 'passed',
      //   statusDetails: {},
      //   steps: [],
      //   stop: 1323475200011,
      // },
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
      // {
      //   attachments: [],
      //   name: 'Coverage: Reset [@cypress/code-coverage]',
      //   parameters: [],
      //   stage: 'finished',
      //   start: 1323475200000,
      //   status: 'passed',
      //   statusDetails: {},
      //   steps: [],
      //   stop: 1323475200011,
      // },
    ],
    stop: 1323475200010,
  },
];

export type TestData = {
  name: string;
  rootSuite: string;
  spec: string;
  fileName: string;
  expect: {
    labels?: { filter: string[]; expected: any[] };
    events?: string[];
    testsNames: string[];

    testStatuses?: {
      testName: string;
      index?: number;
      status: string;
      statusDetails?: { message: string[] | undefined };
    }[];

    testAttachments?: {
      expectMessage?: string; // message to show in test title
      testName: string;
      index?: number;
      attachments: any[];
    }[];

    testParents?: {
      testName: string;
      index?: number;
      parents: { name: string; parent: string | undefined }[];
    }[];

    testSteps?: {
      testName: string;
      index?: number;
      mapStep?: (m: StepResult) => any;
      filterStep?: (m: StepResult) => boolean;
      expected: any[];
    }[];

    parents?: {
      testName: string;
      index?: number;
      containers: {
        name: string;
        stepMap?: (x: StepResult) => any;
        befores?: {
          name?: string;
          attachments?: any[];
          steps?: any[];
        }[];
        afters?: {
          name?: string;
          attachments?: any[];
          steps?: any[];
        }[];
      }[];
    }[];
  };
};

const wrapExpectCreate = (addition: string) => (fn: () => any) => {
  try {
    fn();
  } catch (e) {
    const err = e as Error;
    err.message = addition + err.message;
    throw err;
  }
};

export const selectTestsToRun = (dir: string): TestData[] => {
  const testsOnly = globSync(`${dir}/only-data-*.ts`).map(
    x => require(`${x}`).default,
  );

  const testsForOneCyRun: TestData[] =
    testsOnly.length === 0
      ? globSync(`${dir}/data-*.ts`).map(x => require(`${x}`).default)
      : testsOnly;

  return testsForOneCyRun;
};

export const generateChecksTests = (res: Result, testsForRun: TestData[]) => {
  testsForRun.forEach((testData, i) => {
    const wrapError = wrapExpectCreate(
      `Failed test file: ${testData.name}\n\n` +
        `serve report: \`allure serve ${res.watch}\`\n\n`,
    );

    const getTest = (res: AllureTest[], testName: string) => {
      const tests = res.filter(
        x =>
          x.name === testName &&
          x.fullName?.indexOf(basename(testData.fileName)) !== -1,
      );

      return tests;
    };

    describe(`${testData.name}`, () => {
      let resFixed: AllureTest[];
      let results: AllureTest[];

      beforeAll(() => {
        results = parseAllure(res.watch).filter(
          t => t.fullName?.indexOf(testData.rootSuite) !== -1,
        );
        resFixed = fixResult(results);
      });

      if (testData.expect.testsNames) {
        it('check test full names', () => {
          wrapError(() =>
            expect(resFixed.map(t => t.fullName).sort()).toEqual(
              testData.expect.testsNames,
            ),
          );
        });
      }

      if (testData.expect.testStatuses) {
        testData.expect.testStatuses.forEach(t => {
          it(`should have test '${t.testName}' ${t.index ?? ''} status - ${t.status}`, () => {
            const testAttempts = getTest(resFixed, t.testName);

            wrapError(() =>
              expect(testAttempts[t.index ?? 0]?.status).toEqual(t.status),
            );
          });

          if (t.statusDetails) {
            it(`should have test '${t.testName}' ${t.index ?? ''} statusDetails message`, () => {
              const testAttempts = getTest(resFixed, t.testName);

              wrapError(() =>
                expect(
                  testAttempts[t.index ?? 0]?.statusDetails?.message?.split(
                    '\n',
                  ),
                ).toEqual(t.statusDetails?.message),
              );
            });
          }
        });
      }

      if (testData.expect.labels) {
        it(`check ${testData.expect.labels?.filter?.join(',') ?? ' all'} labels`, () => {
          wrapError(() =>
            expect(
              labelsForTest(resFixed, testData.expect.labels?.filter),
            ).toEqual(testData.expect.labels?.expected),
          );
        });
      }

      if (testData.expect.testAttachments) {
        testData.expect.testAttachments.forEach(t => {
          it(`check '${t.testName}' ${t.index ?? ''} attachments${t.expectMessage ? `: ${t.expectMessage}` : ''}`, () => {
            const testAttempts = getTest(resFixed, t.testName);

            wrapError(() =>
              expect(testAttempts[t.index ?? 0]?.attachments).toEqual(
                t.attachments,
              ),
            );
          });
        });
      }

      if (testData.expect.testParents) {
        testData.expect.testParents.forEach(testItem => {
          it(`parents for test ${testItem.testName} ${testItem.index ?? ''}`, () => {
            const tests = getTest(resFixed, testItem.testName);

            const parents = getParentsArray(tests[testItem.index ?? 0]);

            wrapError(() =>
              expect(
                parents.map(x => ({ name: x.name, parent: x.parent?.name })),
              ).toEqual(testItem.parents),
            );
          });
        });
      }

      if (testData.expect.testSteps) {
        testData.expect.testSteps.forEach(testItem => {
          it(`steps for test ${testItem.testName} ${testItem.index ?? ''}`, () => {
            const tests = getTest(resFixed, testItem.testName);

            const obj = fullStepMap(
              tests[testItem.index ?? 0]!,
              m => ({
                name: m.name,
                ...(testItem.mapStep?.(m) ?? {}),
              }),
              testItem.filterStep,
            );

            wrapError(() => expect(obj).toEqual(testItem.expected));
          });
        });
      }

      if (testData.expect.parents) {
        testData.expect.parents.forEach(testData => {
          describe(`parents for ${testData.testName} ${testData.index ?? ''}`, () => {
            let tests;
            let parents: Parent[];
            const skipItems = ['generatereport', 'coverage'];

            beforeAll(() => {
              tests = getTest(resFixed, testData.testName);
              parents = getParentsArray(tests[testData.index ?? 0]);
            });

            describe('before and after hooks', () => {
              testData.containers.forEach(container => {
                if (container.befores) {
                  it(`check befores for '${testData.testName}' ${testData.index ?? ''} parent '${container.name}'`, () => {
                    const actualParent = parents.find(
                      pp => pp.name === container.name,
                    );

                    // when cov remove first before all

                    const actualBefores = (
                      actualParent?.befores as AllureHook[]
                    )
                      .slice(1)
                      ?.filter(z =>
                        skipItems.every(
                          y => z.name.toLowerCase().indexOf(y) === -1,
                        ),
                      )
                      .sort((z1, z2) =>
                        z1.name && z2.name && z1.name < z2.name ? -1 : 1,
                      );

                    wrapError(() =>
                      expect(actualBefores?.map(x => x.name)).toEqual(
                        container.befores?.map(x => x.name),
                      ),
                    );

                    if (container.befores?.some(t => t.attachments)) {
                      wrapError(() =>
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(actualBefores?.map(x => x.attachments)).toEqual(
                          container.befores?.map(x => x.attachments),
                        ),
                      );
                    }

                    if (container.befores?.some(t => t.steps)) {
                      const beforesSteps = actualBefores?.map(x =>
                        mapSteps(x.steps, container.stepMap),
                      );

                      wrapError(() =>
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(beforesSteps).toEqual(
                          container.befores?.map(x => x.steps),
                        ),
                      );
                    }
                  });
                }

                if (container.afters) {
                  it(`check afters for '${testData.testName}' ${testData.index ?? ''} parent '${container.name}'`, () => {
                    const actualParent = parents.find(
                      pp => pp.name === container.name,
                    );

                    const actualAfters = (actualParent?.afters as AllureHook[])
                      ?.filter(z =>
                        skipItems.every(
                          y => z.name.toLowerCase().indexOf(y) === -1,
                        ),
                      )
                      .sort((z1, z2) =>
                        z1.name && z2.name && z1.name < z2.name ? -1 : 1,
                      );

                    expect(actualAfters?.map(x => x.name)).toEqual(
                      container.afters?.map(x => x.name),
                    );

                    if (container.afters?.some(t => t.attachments)) {
                      wrapError(() =>
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(actualAfters?.map(x => x.attachments)).toEqual(
                          container.afters?.map(x => x.attachments),
                        ),
                      );
                    }

                    if (container.afters?.some(t => t.steps)) {
                      const aftersSteps = actualAfters?.map(x =>
                        mapSteps(x.steps, container.stepMap),
                      );

                      wrapError(() =>
                        // eslint-disable-next-line jest/no-conditional-expect
                        expect(aftersSteps).toEqual(
                          container.afters?.map(x => x.steps),
                        ),
                      );
                    }
                  });
                }
              });
            });
          });
        });
      }

      if (testData.expect.events) {
        it('should have correct events for spec', () => {
          const specName = basename(res.specs[i]);
          const events = eventsForFile(res, specName);

          const skipItems = [
            'collectBackendCoverage',
            'mergeUnitTestCoverage',
            'generateReport',
          ];

          wrapError(() =>
            expect(
              events.filter(x => skipItems.every(z => x.indexOf(z) === -1)),
            ).toEqual(testData.expect.events),
          );
        });
      }
    });
  });
};
