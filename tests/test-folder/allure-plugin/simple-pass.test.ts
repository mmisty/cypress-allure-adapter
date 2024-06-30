import { parseAllure } from 'allure-js-parser';
import { createResTest, fixResult } from '@test-utils';

describe('run one test', () => {
  const storeResDir = createResTest(__filename);

  it(`check ${storeResDir}`, async () => {
    const results = parseAllure(storeResDir);
    const resFixed = fixResult(results);

    expect(resFixed).toEqual([
      {
        attachments: [
          {
            name: 'simple-pass.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/simple-pass.cy.ts',
        fullName: 'suite with one test #2 test pass',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'suite with one test',
          },
          {
            name: 'parentSuite',
            value: 'suite with one test',
          },
          {
            name: 'path',
            value: 'integration/e2e/simple-pass.cy.ts',
          },
        ],
        links: [],
        name: '#2 test pass',
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
          ],
          name: 'suite with one test',
          uuid: 'no',
        },
        stage: 'finished',
        start: 1323475200000,
        status: 'passed',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: '"before each" hook: Register allure test',
            parameters: [],
            stage: 'pending',
            start: 1323475200000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: log, Registered allureAdapterSetup',
                parameters: [],
                stage: 'pending',
                start: 1323475200000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323475200011,
              },
            ],
            stop: 1323475200011,
          },
          {
            attachments: [],
            name: '"before each" hook',
            parameters: [],
            stage: 'pending',
            start: 1323475200000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323475200011,
          },
          {
            attachments: [],
            name: 'route: undefined',
            parameters: [],
            stage: 'pending',
            start: 1323475200000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323475200011,
          },
          {
            attachments: [],
            name: 'visit: mytest.com',
            parameters: [],
            stage: 'pending',
            start: 1323475200000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323475200011,
          },
          {
            attachments: [],
            name: 'get: div',
            parameters: [],
            stage: 'pending',
            start: 1323475200000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'assert: expected **[ <div>, 1 more... ]** to exist in the DOM',
                parameters: [],
                stage: 'pending',
                start: 1323475200000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323475200011,
              },
            ],
            stop: 1323475200011,
          },
          {
            attachments: [],
            name: 'myLog: log task',
            parameters: [],
            stage: 'pending',
            start: 1323475200000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323475200011,
          },
          {
            attachments: [],
            name: 'task: log, log task',
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
        uuid: 'no',
      },
    ]);
  });
});
