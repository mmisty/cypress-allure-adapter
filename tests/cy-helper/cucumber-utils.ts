import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename } from 'path';
import { parseBoolean } from 'cypress-redirect-browser-log/utils/functions';

type Res = {
  res:
    | CypressCommandLine.CypressRunResult
    | CypressCommandLine.CypressFailedRunResult
    | undefined;
};
type Result = {
  watch: string;
  specs: string[];
  result: Res;
};

// eslint-disable-next-line jest/no-export
export const createCucumberTestRes = (
  specTexts: string[],
  impl: string[],
  envConfig?: Record<string, string | undefined>,
): Result => {
  const result: Res = { res: undefined };
  const testsPath = `${process.cwd()}/integration/cucumber/temp`;
  const specPaths: string[] = [];

  if (!existsSync(testsPath)) {
    mkdirSync(testsPath);
  }

  specTexts.forEach((content, i) => {
    const specPath = `${testsPath}/test_${i}_${Date.now()}.feature`;
    const implPath = `${testsPath}/test_${i}_${Date.now()}.ts`;
    writeFileSync(specPath, content);

    if (impl[i]) {
      writeFileSync(implPath, impl[i]);
    }
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

  const name = basename(specPaths[0], '.feature');
  const testname = `${name}.feature`;
  const storeResDir = `allure-results/${testname}`;

  const env = {
    allure: 'true',
    allureResults: storeResDir,
    allureResultsWatchPath: `${storeResDir}/watch`,
    allureCleanResults: 'true',
    allureSkipCommands: 'intercept',
    //   COVERAGE: false, // `${process.env.COVERAGE === 'true'}`,
    JEST_TEST: 'true',
    cucumber: 'true',
    COVERAGE: 'false',
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
      process.env.COVERAGE = 'false';
      env.cucumber = 'true';

      console.log(`SPEC: ${spec}`);
      result.res = await cy.run({
        configFile: 'cypress.cucumber-test.config.ts',
        spec: [spec],
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
