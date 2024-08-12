import { TestData } from '@test-utils';
import { basename } from 'path';
import { visitHtmlCode } from '../assertions/visit-html';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', { defaultCommandTimeout: 300, env: { 
  allureSkipCommands: 'within'
} },() => {
  ${visitHtmlCode}
  
  it('test 1 - pass', () => {
    cy.contains('Apple').eq(0).within(($el) => {
      cy.wrap($el, {log:false}).should('be.visible');
      cy.log('1');
    });
    cy.contains('Banana')
  });
});
    `,

  expect: {
    testsNames: [`${rootSuite} test 1 - pass`],

    testStatuses: [
      {
        testName: 'test 1 - pass',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
    ],

    testSteps: [
      {
        testName: 'test 1 - pass',
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
            name: 'contains: Apple',
            status: 'passed',
            statusDetails: {},
            steps: [],
          },
          {
            attachments: [],
            name: 'eq: 0',
            status: 'passed',
            statusDetails: {},
            steps: [],
          },
          {
            attachments: [],
            name: 'within',
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'assert: expected **<div>** to be **visible**',
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
            ],
          },
          {
            attachments: [],
            name: 'contains: Banana',
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
