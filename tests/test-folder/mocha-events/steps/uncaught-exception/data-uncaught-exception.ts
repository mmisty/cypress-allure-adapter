import { TestData } from '@test-utils';
import { basename } from 'path';
import { visitHtmlCode } from '../assertions/visit-html'; // todo move

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', { defaultCommandTimeout: 300 },() => {
  ${visitHtmlCode}
  it('#1 test pass', function () {
    cy.on('uncaught:exception', () => {
      // returning false here prevents Cypress from
      // failing the test
      return false;
    });

    visitHtml({ body: '<div>hello</div>', script: \`throw new Error('UNCAUGHT 1');\`});

    cy.get('div').should('exist');
  });

  it('#2 test pass with parent', function () {
    cy.on('uncaught:exception', () => {
      // returning false here prevents Cypress from
      // failing the test
      return false;
    });

    cy.allure().startStep('VISITING');
    visitHtml({ body: '<div>hello</div>', script: \`throw new Error('UNCAUGHT 1');\`});

    cy.allure().endStep();
    cy.get('div').should('exist');
  });

  it('#3 test fail not because of exception', function () {
    cy.on('uncaught:exception', () => {
      // returning false here prevents Cypress from
      // failing the test
      return false;
    });
    cy.allure().startStep('VISITING');
    visitHtml({ body: '<div>hello</div>', script: \`throw new Error('UNCAUGHT 1');\`});
    cy.get('div').should('not.exist');
    cy.allure().endStep();
  });

  it('#4 test fail because of exception', function () {
    cy.allure().startStep('VISITING');
    visitHtml({ body: '<div>hello</div>', script: \`throw new Error('UNCAUGHT 1');\`});
    cy.allure().endStep();
  });
});
    `,

  expect: {
    testsNames: [
      `${rootSuite} #1 test pass`,
      `${rootSuite} #2 test pass with parent`,
      `${rootSuite} #3 test fail not because of exception`,
      `${rootSuite} #4 test fail because of exception`,
    ],

    testStatuses: [
      {
        testName: '#1 test pass',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: '#2 test pass with parent',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: '#3 test fail not because of exception',
        index: 0,
        status: 'failed',
        statusDetails: {
          message: [
            'Timed out retrying after 300ms: Expected <div> not to exist in the DOM, but it was continuously found.',
          ],
        },
      },
      {
        testName: '#4 test fail because of exception',
        index: 0,
        status: 'failed',
        statusDetails: {
          message: [
            'The following error originated from your application code, not from Cypress.',
            '',
            '  > UNCAUGHT 1',
            '',
            'When Cypress detects uncaught errors originating from your application it will automatically fail the current test.',
            '',
            'This behavior is configurable, and you can choose to turn this off by listening to the `uncaught:exception` event.',
            '',
            'https://on.cypress.io/uncaught-exception-from-application',
          ],
        },
      },
    ],

    testSteps: [
      {
        testName: '#1 test pass',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetailsMsg: m.statusDetails?.message,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'route',
            status: 'passed',
            statusDetailsMsg: undefined,
            steps: [],
          },
          {
            attachments: [],
            name: 'visit: mytest.com',
            status: 'broken',
            statusDetailsMsg: undefined,
            steps: [
              {
                attachments: [],
                name: 'uncaught exception: Error: UNCAUGHT 1',
                status: 'broken',
                statusDetailsMsg: 'UNCAUGHT 1',
                steps: [],
              },
            ],
          },
          {
            attachments: [],
            name: 'get: div',
            status: 'passed',
            statusDetailsMsg: undefined,
            steps: [
              {
                attachments: [],
                name: 'assert: expected **<div>** to exist in the DOM',
                status: 'passed',
                statusDetailsMsg: undefined,
                steps: [],
              },
            ],
          },
        ],
      },
      {
        testName: '#2 test pass with parent',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetailsMsg: m.statusDetails?.message,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'VISITING',
            status: 'broken',
            steps: [
              {
                attachments: [],
                name: 'route',
                status: 'passed',
                steps: [],
              },
              {
                attachments: [],
                name: 'visit: mytest.com',
                status: 'broken',
                steps: [
                  {
                    attachments: [],
                    name: 'uncaught exception: Error: UNCAUGHT 1',
                    status: 'broken',
                    statusDetailsMsg: 'UNCAUGHT 1',
                    steps: [],
                  },
                ],
              },
            ],
          },
          {
            attachments: [],
            name: 'get: div',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'assert: expected **<div>** to exist in the DOM',
                status: 'passed',
                steps: [],
              },
            ],
          },
        ],
      },
      {
        testName: '#3 test fail not because of exception',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetailsMsg: m.statusDetails?.message,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'VISITING',
            status: 'failed',
            statusDetailsMsg:
              'Timed out retrying after 300ms: Expected <div> not to exist in the DOM, but it was continuously found.',
            steps: [
              {
                attachments: [],
                name: 'route',
                status: 'passed',
                steps: [],
              },
              {
                attachments: [],
                name: 'visit: mytest.com',
                status: 'broken',
                steps: [
                  {
                    attachments: [],
                    name: 'uncaught exception: Error: UNCAUGHT 1',
                    status: 'broken',
                    statusDetailsMsg: 'UNCAUGHT 1',
                    steps: [],
                  },
                ],
              },
              {
                attachments: [],
                name: 'get: div',
                status: 'failed',
                steps: [
                  {
                    attachments: [],
                    name: 'assert: expected **<div>** not to exist in the DOM',
                    status: 'failed',
                    steps: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        testName: '#4 test fail because of exception',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetailsMsg: m.statusDetails?.message,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'VISITING',
            status: 'failed',
            statusDetailsMsg:
              'The following error originated from your application code, not from Cypress.\n\n  > UNCAUGHT 1\n\nWhen Cypress detects uncaught errors originating from your application it will automatically fail the current test.\n\nThis behavior is configurable, and you can choose to turn this off by listening to the `uncaught:exception` event.\n\nhttps://on.cypress.io/uncaught-exception-from-application',
            steps: [
              {
                attachments: [],
                name: 'route',
                status: 'passed',
                steps: [],
              },
              {
                attachments: [],
                name: 'visit: mytest.com',
                status: 'failed',
                steps: [
                  {
                    attachments: [],
                    name: 'uncaught exception: Error: UNCAUGHT 1',
                    status: 'failed',
                    statusDetailsMsg: 'UNCAUGHT 1',
                    steps: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

export default data;
