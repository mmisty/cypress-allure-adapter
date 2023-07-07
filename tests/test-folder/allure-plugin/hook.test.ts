import { parseAllure } from 'allure-js-parser';
import { createResTest, fixResult } from '../../cy-helper/utils';

describe('run one test', () => {
  const storeResDir = createResTest(__filename);

  it(`check ${storeResDir}`, async () => {
    const results = parseAllure(storeResDir);
    const resFixed = fixResult(results);

    expect(resFixed).toEqual([
      {
        attachments: [
          {
            name: 'test 2 -- after all hook generateReport (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'hook.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/hook.cy.ts',
        fullName: 'hooks test test 2',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'hooks test',
          },
          {
            name: 'parentSuite',
            value: 'hooks test',
          },
          {
            name: 'path',
            value: 'integration/e2e/hook.cy.ts',
          },
        ],
        links: [],
        name: 'test 2',
        parameters: [],
        parent: {
          afters: [
            {
              attachments: [],
              name: '"after all" hook',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'log: after',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
            {
              attachments: [],
              name: '"after all" hook: named hook all after',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'log: after',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
          ],
          befores: [
            {
              attachments: [],
              name: '"before all" hook',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'Coverage: Reset [@cypress/code-coverage]',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
            {
              attachments: [],
              name: '"before all" hook: Global Setup',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'global setup',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
            {
              attachments: [],
              name: '"before all" hook',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'log: before',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
            {
              attachments: [],
              name: '"before all" hook: named hook before',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'log: before',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
          ],
          name: 'hooks test',
          uuid: 'no',
        },
        stage: 'finished',
        start: 1323460800000,
        status: 'passed',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: '"before each" hook: Register allure test',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: log, Registered allureAdapterSetup',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"before each" hook',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"before each" hook: Named hook',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: before each',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"before each" hook',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: no name hook - before each',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'log: test 2',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"after each" hook',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: log after each',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"after each" hook: Named after',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: log after each',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
        ],
        stop: 1323460800010,
        uuid: 'no',
      },
      {
        attachments: [
          {
            name: 'hook.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/hook.cy.ts',
        fullName: 'hooks test test 1',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'hooks test',
          },
          {
            name: 'parentSuite',
            value: 'hooks test',
          },
          {
            name: 'path',
            value: 'integration/e2e/hook.cy.ts',
          },
        ],
        links: [],
        name: 'test 1',
        parameters: [],
        parent: {
          afters: [
            {
              attachments: [],
              name: '"after all" hook',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'log: after',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
            {
              attachments: [],
              name: '"after all" hook: named hook all after',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'log: after',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
          ],
          befores: [
            {
              attachments: [],
              name: '"before all" hook',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'Coverage: Reset [@cypress/code-coverage]',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
            {
              attachments: [],
              name: '"before all" hook: Global Setup',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'global setup',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
            {
              attachments: [],
              name: '"before all" hook',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'log: before',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
            {
              attachments: [],
              name: '"before all" hook: named hook before',
              parameters: [],
              stage: 'finished',
              start: 1323460800000,
              status: 'passed',
              statusDetails: {},
              steps: [
                {
                  attachments: [],
                  name: 'log: before',
                  parameters: [],
                  stage: 'pending',
                  start: 1323460800000,
                  status: 'passed',
                  statusDetails: {},
                  steps: [],
                  stop: 1323460800011,
                },
              ],
              stop: 1323460800010,
            },
          ],
          name: 'hooks test',
          uuid: 'no',
        },
        stage: 'finished',
        start: 1323460800000,
        status: 'passed',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: '"before each" hook: Register allure test',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: log, Registered allureAdapterSetup',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"before each" hook',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"before each" hook: Named hook',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: before each',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"before each" hook',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: no name hook - before each',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'log: test 1',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"after each" hook',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: log after each',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: '"after each" hook: Named after',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: log after each',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
        ],
        stop: 1323460800010,
        uuid: 'no',
      },
    ]);
  });
});