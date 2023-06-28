import { parseAllure } from 'allure-js-parser';
import { delay } from 'jest-test-each/dist/tests/utils/utils';
import { ExecutableItem } from 'allure-js-commons';
import { execSync } from 'child_process';

jest.setTimeout(70000);

describe('run one test', () => {
  const cwd = process.cwd();

  beforeAll(async () => {
    await execSync('npm run build');
  });

  it('create results', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cy = require('cypress');
    const storeResDir = 'allure-results/one.cy.ts';
    const spec = `${cwd}/integration/e2e/one.cy.ts`;
    const port = 56522;
    let err: Error | undefined;
    let res;

    try {
      res = await cy.run({
        spec,
        port,
        env: { allureResults: storeResDir, DEBUG: 'cypress:server:project' },
        reporter: 'lib/setup/allure-mocha-reporter.js',
        reporterOptions: {
          allureResults: storeResDir,
        },
      });
    } catch (e) {
      err = e as Error;
    }
    await delay(2000);
    console.log(res);

    expect(err).toBeUndefined();
  });

  it.skip('check', async () => {
    const storeResDir = 'allure-results/one.cy.ts';
    const results = parseAllure(storeResDir);
    const date = Date.parse('10 Dec 2011');

    const replaceSteps = (steps: ExecutableItem[]): any[] => {
      if (steps.length === 0) {
        return [];
      }

      return steps.map(s => ({ ...s, start: date, stop: date + 11, steps: replaceSteps(s.steps) }));
    };

    const resFixed = results.map(r => {
      return {
        ...r,
        historyId: 'no',
        uuid: 'no',
        start: date,
        stop: date + 10,
        parent: { ...r.parent, uuid: 'no' },
        steps: replaceSteps(r.steps),
      };
    });

    expect(resFixed).toEqual([
      {
        attachments: [],
        fullName: 'one two test pass',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'one.two',
          },
          {
            name: 'parentSuite',
            value: 'one',
          },
          {
            name: 'suite',
            value: 'two',
          },
        ],
        links: [],
        name: 'test pass',
        parameters: [],
        parent: {
          uuid: 'no',
        },
        stage: 'pending',
        start: 1323460800000,
        status: 'passed',
        statusDetails: {},
        stop: 1323460800010,
        uuid: 'no',
        steps: [
          {
            attachments: [],
            name: 'visit ["https://example.cypress.io/"]',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'get ["div"]',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            stop: 1323460800011,
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'task ["hello"]',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
          },
        ],
      },
    ]);
  });
});
