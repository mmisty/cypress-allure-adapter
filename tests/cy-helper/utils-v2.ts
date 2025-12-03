import { globSync } from 'fast-glob';
import process from 'node:process';
import { parseBoolean } from 'cypress-redirect-browser-log/utils/functions';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { writeFileSync } from 'fs';
import { StepResult } from 'allure-js-commons';
import { execSync } from 'child_process';
import path from 'path';

jest.setTimeout(360000);

export type PreparedResults = {
  watchResults: AllureTest[];
  results: AllureTest[];
  watchDir: string;
};

export const outputDebugGenerate = dir => {
  console.log(
    `cd "${dir}"&&allure generate --clean "allure-results/watch"&&allure open`,
  );
  writeFileSync(
    `${dir}/debug-generate.sh`,
    `#!/bin/bash\ncd "${dir}"&&allure generate --clean "allure-results/watch"&&allure open`,
  );
  execSync(`chmod +x ${dir}/debug-generate.sh`);
};

export const getTest = (watchResults: AllureTest[], name: string) => {
  return watchResults.find(t => t.name?.indexOf(name) !== -1);
};

export const readResults = (dir: string): PreparedResults => {
  const watchDir = `${dir}/allure-results/watch`;

  const watchResults = parseAllure(`${dir}/allure-results/watch`, {
    failOnError: false,
    logError: false,
  });

  const results = parseAllure(`${dir}/allure-results`, {
    failOnError: false,
    logError: false,
  });

  return {
    watchResults,
    results,
    watchDir,
  };
};

export const getResults = (
  dir: string,
  options?: {
    allowCyFail?: boolean;
    env?: Record<string, any>;
  },
) => {
  const allowCyFail = options?.allowCyFail ?? false;
  const results = readResults(dir);

  if (results.watchResults.length === 0 && !allowCyFail) {
    throw new Error('No allure results found');
  }

  return results;
};

export const prepareResults = async (
  dir: string,
  options?: {
    allowCyFail?: boolean;
    env?: Record<string, any>;
    onlyGetResults?: boolean;
  },
): Promise<PreparedResults> => {
  // const allureResults = `${dir}/allure-results`;

  // if (existsSync(allureResults)) {
  //   if (`${process.env.COVERAGE}` !== 'true') {
  //     return readResults(dir);
  //   }
  // }

  const allowCyFail = options?.allowCyFail ?? false;
  const onlyGetResults = options?.onlyGetResults ?? false;

  if (onlyGetResults) {
    const results = readResults(dir);

    if (results.watchResults.length === 0 && !allowCyFail) {
      throw new Error('No allure results found');
    }

    return results;
  }

  const env = options?.env ?? {};
  const specs = globSync(`${dir}/cypress/*.cy.ts`);

  const spec = specs.join(',');

  const configFile = `${process.cwd()}/cypress.e2e.config.ts`;

  const port = 40000 + Math.round(Math.random() * 25000);

  const video = parseBoolean(
    `${env?.video === undefined ? false : env?.video}`,
  );

  process.env.DEBUG = env?.DEBUG ? 'cypress-allure*' : '';
  process.env.COVERAGE_REPORT_DIR = 'reports/coverage-cypress';

  // for not having type issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cy = require('cypress');

  const res = await cy
    .run({
      configFile,
      spec: spec,
      port,
      browser: 'chrome',
      video,
      env: {
        allure: 'true',
        allureResults: `${dir}/allure-results`,
        allureResultsWatchPath: `${dir}/allure-results/watch`,
        allureAddVideoOnPass: 'true',
        allureCleanResults: 'true',
        allureSkipCommands: 'intercept',
        COVERAGE_REPORT_DIR: process.env.COVERAGE_REPORT_DIR,
        COVERAGE: `${process.env.COVERAGE}` === 'true',
        JEST_TEST: 'true',
        ...env,
      },
      quiet: `${process.env.QUIET}` === 'true',
    } as any)
    .catch(e => {
      console.log('Exception when running cypress', e);
      throw e;
    });

  // console.log(res);

  if ((res as any)?.status === 'failed' && !allowCyFail) {
    console.error('Cypress run failed:', (res as any).message);
    throw new Error(`Cypress run failed: ${(res as any).message}`);
  }

  const results = readResults(dir);

  if (results.watchResults.length === 0 && !allowCyFail) {
    throw new Error('No allure results found');
  }

  return results;
};

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

export const mapAttachments = (itemaAttachments: any[]) => {
  return itemaAttachments
    .map(t => ({
      ...t,
      name: fixAttachName(t.name),
      source: `source${path.extname(t.source)}`,
    }))
    .sort((z1, z2) => (z1.name && z2.name && z1.name < z2.name ? -1 : 1));
};
// export const stepsAndAttachments = (test: AllureTest | undefined) => {
//   return {
//     attachments:
//       test?.attachments.map(x => ({ ...x, source: undefined })) ?? [],
//     steps:
//       mapSteps(
//         test?.steps ?? [],
//         x => ({
//           name: x.name,
//           attachments: x.attachments.map(y => ({ ...y, source: undefined })),
//         }),
//         x =>
//           x.name?.indexOf('before each') === -1 &&
//           x.name?.indexOf('after each') === -1,
//       ) ?? [],
//   };
// };
