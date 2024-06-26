import { parseAllure } from 'allure-js-parser';
import { createResTest, fixResult } from '@test-utils';

describe('run retries test - fails', () => {
  const storeResDir = createResTest(__filename);

  it(`check ${storeResDir}`, async () => {
    const results = parseAllure(storeResDir);
    const resFixed = fixResult(results);

    expect(resFixed).toEqual([
      {
        attachments: [
          {
            name: 'retries fail -- should fail on retries (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'retries fail -- should fail on retries (failed) (attempt 2).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'retries fail -- should fail on retries (failed) (attempt 3).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'should fail on retries -- after all hook generateReport (failed) (attempt 3).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'retries-fail.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/retries/retries-fail.cy.ts',
        fullName: 'retries: fail should fail on retries',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'retries: fail',
          },
          {
            name: 'parentSuite',
            value: 'retries: fail',
          },
          {
            name: 'path',
            value: 'integration/e2e/retries/retries-fail.cy.ts',
          },
        ],
        links: [],
        name: 'should fail on retries',
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
          name: 'retries: fail',
          uuid: 'no',
        },
        stage: 'finished',
        start: 1323475200000,
        status: 'failed',
        statusDetails: {
          message:
            'Expected [ <div>, 1 more... ] not to exist in the DOM, but it was continuously found.',
          trace:
            'AssertionError: Expected [ <div>, 1 more... ] not to exist in the DOM, but it was continuously found.\n    at Context.eval (webpack://@mmisty/cypress-allure-adapter/./integration/e2e/retries/retries-fail.cy.ts:8:7)',
        },
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
            steps: [],
            stop: 1323475200011,
          },
          {
            attachments: [],
            name: 'should: not.exist',
            parameters: [],
            stage: 'pending',
            start: 1323475200000,
            status: 'failed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'assert: expected **[ <div>, 1 more... ]** not to exist in the DOM',
                parameters: [],
                stage: 'pending',
                start: 1323475200000,
                status: 'failed',
                statusDetails: {},
                steps: [],
                stop: 1323475200011,
              },
            ],
            stop: 1323475200011,
          },
        ],
        stop: 1323475200010,
        uuid: 'no',
      },
      {
        attachments: [
          {
            name: 'retries fail -- should fail on retries (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'retries fail -- should fail on retries (failed) (attempt 2).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'retries fail -- should fail on retries (failed) (attempt 3).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'should fail on retries -- after all hook generateReport (failed) (attempt 3).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'retries-fail.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/retries/retries-fail.cy.ts',
        fullName: 'retries: fail should fail on retries',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'retries: fail',
          },
          {
            name: 'parentSuite',
            value: 'retries: fail',
          },
          {
            name: 'path',
            value: 'integration/e2e/retries/retries-fail.cy.ts',
          },
        ],
        links: [],
        name: 'should fail on retries',
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
          name: 'retries: fail',
          uuid: 'no',
        },
        stage: 'finished',
        start: 1323475200000,
        status: 'failed',
        statusDetails: {
          message:
            'Expected [ <div>, 1 more... ] not to exist in the DOM, but it was continuously found.',
          trace:
            'AssertionError: Expected [ <div>, 1 more... ] not to exist in the DOM, but it was continuously found.\n    at Context.eval (webpack://@mmisty/cypress-allure-adapter/./integration/e2e/retries/retries-fail.cy.ts:8:7)',
        },
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
            steps: [],
            stop: 1323475200011,
          },
          {
            attachments: [],
            name: 'should: not.exist',
            parameters: [],
            stage: 'pending',
            start: 1323475200000,
            status: 'failed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'assert: expected **[ <div>, 1 more... ]** not to exist in the DOM',
                parameters: [],
                stage: 'pending',
                start: 1323475200000,
                status: 'failed',
                statusDetails: {},
                steps: [],
                stop: 1323475200011,
              },
            ],
            stop: 1323475200011,
          },
        ],
        stop: 1323475200010,
        uuid: 'no',
      },
      {
        attachments: [
          {
            name: 'retries fail -- should fail on retries (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'retries fail -- should fail on retries (failed) (attempt 2).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'retries fail -- should fail on retries (failed) (attempt 3).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'should fail on retries -- after all hook generateReport (failed) (attempt 3).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'retries-fail.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/retries/retries-fail.cy.ts',
        fullName: 'retries: fail should fail on retries',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'retries: fail',
          },
          {
            name: 'parentSuite',
            value: 'retries: fail',
          },
          {
            name: 'path',
            value: 'integration/e2e/retries/retries-fail.cy.ts',
          },
        ],
        links: [],
        name: 'should fail on retries',
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
          name: 'retries: fail',
          uuid: 'no',
        },
        stage: 'finished',
        start: 1323475200000,
        status: 'failed',
        statusDetails: {
          message:
            'Expected [ <div>, 1 more... ] not to exist in the DOM, but it was continuously found.',
          trace:
            'AssertionError: Expected [ <div>, 1 more... ] not to exist in the DOM, but it was continuously found.\n    at Context.eval (webpack://@mmisty/cypress-allure-adapter/./integration/e2e/retries/retries-fail.cy.ts:8:7)',
        },
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
            steps: [],
            stop: 1323475200011,
          },
          {
            attachments: [],
            name: 'should: not.exist',
            parameters: [],
            stage: 'pending',
            start: 1323475200000,
            status: 'failed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'assert: expected **[ <div>, 1 more... ]** not to exist in the DOM',
                parameters: [],
                stage: 'pending',
                start: 1323475200000,
                status: 'failed',
                statusDetails: {},
                steps: [],
                stop: 1323475200011,
              },
            ],
            stop: 1323475200011,
          },
        ],
        stop: 1323475200010,
        uuid: 'no',
      },
    ]);
  });
});
