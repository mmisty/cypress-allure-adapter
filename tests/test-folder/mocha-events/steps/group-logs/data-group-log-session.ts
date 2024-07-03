import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', { defaultCommandTimeout: 300 },() => {
  
  it('test 1 - create new and restore', () => {
    Cypress.session.clearAllSavedSessions();
    cy.session('user123', () => {
      cy.log('1');
      cy.setCookie('A', 'AAA');
    });

    // tod restore

    cy.log('next step 2');
  });
});
    `,

  expect: {
    testsNames: [`${rootSuite} test 1 - create new and restore`],

    testStatuses: [
      {
        testName: 'test 1 - create new and restore',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
    ],

    testSteps: [
      {
        testName: 'test 1 - create new and restore',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetails: m.statusDetails,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'session: user123',
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'session: user123',
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
              {
                attachments: [],
                name: 'Create new session',
                status: 'passed',
                statusDetails: {},
                steps: [
                  {
                    attachments: [],
                    name: 'Clear page',
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                  },
                  {
                    attachments: [],
                    name: 'Clear cookies, localStorage and sessionStorage',
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                  },
                  {
                    attachments: [],
                    name: 'log: 1',
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                  },
                  {
                    attachments: [],
                    name: 'setCookie: A, AAA',
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                  },
                ],
              },
              {
                attachments: [],
                name: 'Clear page',
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
            ],
          },

          {
            attachments: [],
            name: 'log: next step 2',
            status: 'passed',
            statusDetails: {},
            steps: [],
          },
        ],
      },
    ],
  },
};

export default data;
