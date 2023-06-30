import { execSync } from 'child_process';
import { basename } from 'path';
import cy from 'cypress';
import { delay } from 'jest-test-each/dist/tests/utils/utils';

jest.setTimeout(70000);

export const createResTest = (fileName: string): string => {
  const cwd = process.cwd();
  beforeAll(async () => {
    await execSync('npm run build');
  });

  const name = basename(fileName, '.test.ts');
  const testname = `${name}.cy.ts`;
  const storeResDir = `allure-results/${testname}`;

  it('create results', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cy = require('cypress');
    //const spec = [`${cwd}/integration/e2e/simple-pass.cy.ts`, `${cwd}/integration/e2e/${testname}`];
    const spec = [`${cwd}/integration/e2e/${testname}`, `${cwd}/integration/e2e/simple-pass.cy.ts`];
    const port = 56522;
    let err: Error | undefined;
    let res;

    try {
      res = await cy.run({
        spec,
        port,
        // env: { allureResults: storeResDir, DEBUG: 'cypress:server:project' },
        browser: 'chrome',
        reporter: 'lib/setup/allure-mocha-reporter.js',
        reporterOptions: {
          allureResults: storeResDir,
        },
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
