import { parseAllure } from 'allure-js-parser';
import { createResTest, fixResult } from '../../cy-helper/utils';

describe('run one test', () => {
  const storeResDir = createResTest(__filename);

  it(`check ${storeResDir}`, async () => {
    const results = parseAllure(storeResDir);
    const resFixed = fixResult(results);

    expect(resFixed.map(t => t.name).sort()).toEqual(['test 1', 'test 2', 'test 3']);
    expect(resFixed.filter(t => t.name === 'test 1')).toEqual([
      {
        attachments: [
          {
            name: 'test 1 -- before all hook Global Setup (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'test 1 -- after all hook generateReport (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'hook-fail-all.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/hook-fail-all.cy.ts',
        fullName: 'hooks test - failed global hook test 1',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'hooks test - failed global hook',
          },
          {
            name: 'parentSuite',
            value: 'hooks test - failed global hook',
          },
          {
            name: 'path',
            value: 'integration/e2e/hook-fail-all.cy.ts',
          },
        ],
        links: [],
        name: 'test 1',
        parameters: [],
        parent: {
          afters: [],
          befores: [
            {
              attachments: [],
              name: '"before all" hook',
              parameters: [],
              stage: 'finished',
              start: 1323475200000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'Coverage: Reset [@cypress/code-coverage]',
                  parameters: [],
                  stage: 'pending',
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
              name: '"before all" hook: Global Setup',
              parameters: [],
              stage: 'finished',
              start: 1323475200000,
              statusDetails: {},
              steps: [],
              stop: 1323475200010,
            },
          ],
          name: 'hooks test - failed global hook',
          uuid: 'no',
        },
        stage: 'finished',
        start: 1323475200000,
        status: 'failed',
        statusDetails: {
          message: 'Failed Before ALL',
          trace:
            'Error: Failed Before ALL\n    at Context.eval (webpack://@mmisty/cypress-allure-adapter/./integration/e2e/hook-fail-all.cy.ts:4:8)',
        },
        steps: [],
        stop: 1323475200010,
        uuid: 'no',
      },
    ]);
    expect(resFixed.filter(t => t.name === 'test 2')).toEqual([
      {
        attachments: [
          {
            name: 'hook-fail-all.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/hook-fail-all.cy.ts',
        fullName: 'hooks test - failed global hook test 2',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'hooks test - failed global hook',
          },
          {
            name: 'parentSuite',
            value: 'hooks test - failed global hook',
          },
          {
            name: 'path',
            value: 'integration/e2e/hook-fail-all.cy.ts',
          },
        ],
        links: [],
        name: 'test 2',
        parameters: [],
        parent: {
          afters: [],
          befores: [
            {
              attachments: [],
              name: '"before all" hook',
              parameters: [],
              stage: 'finished',
              start: 1323475200000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'Coverage: Reset [@cypress/code-coverage]',
                  parameters: [],
                  stage: 'pending',
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
              name: '"before all" hook: Global Setup',
              parameters: [],
              stage: 'finished',
              start: 1323475200000,
              statusDetails: {},
              steps: [],
              stop: 1323475200010,
            },
          ],
          name: 'hooks test - failed global hook',
          uuid: 'no',
        },
        stage: 'pending',
        start: 1323475200000,
        status: 'unknown',
        statusDetails: {
          message: 'Failed Before ALL',
          trace:
            'Error: Failed Before ALL\n    at Context.eval (webpack://@mmisty/cypress-allure-adapter/./integration/e2e/hook-fail-all.cy.ts:4:8)',
        },
        steps: [],
        stop: 1323475200010,
        uuid: 'no',
      },
    ]);
    expect(resFixed.filter(t => t.name === 'test 3')).toEqual([
      {
        attachments: [
          {
            name: 'hook-fail-all.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/hook-fail-all.cy.ts',
        fullName: 'hooks test - failed global hook more tests test 3',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'hooks test - failed global hook',
          },
          {
            name: 'parentSuite',
            value: 'hooks test - failed global hook',
          },
          {
            name: 'path',
            value: 'integration/e2e/hook-fail-all.cy.ts',
          },
        ],
        links: [],
        name: 'test 3',
        parameters: [],
        parent: {
          afters: [],
          befores: [
            {
              attachments: [],
              name: '"before all" hook',
              parameters: [],
              stage: 'finished',
              start: 1323475200000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'Coverage: Reset [@cypress/code-coverage]',
                  parameters: [],
                  stage: 'pending',
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
              name: '"before all" hook: Global Setup',
              parameters: [],
              stage: 'finished',
              start: 1323475200000,
              statusDetails: {},
              steps: [],
              stop: 1323475200010,
            },
          ],
          name: 'hooks test - failed global hook',
          uuid: 'no',
        },
        stage: 'pending',
        start: 1323475200000,
        status: 'unknown',
        statusDetails: {
          message: 'Failed Before ALL',
          trace:
            'Error: Failed Before ALL\n    at Context.eval (webpack://@mmisty/cypress-allure-adapter/./integration/e2e/hook-fail-all.cy.ts:4:8)',
        },
        steps: [],
        stop: 1323475200010,
        uuid: 'no',
      },
    ]);
  });
});
