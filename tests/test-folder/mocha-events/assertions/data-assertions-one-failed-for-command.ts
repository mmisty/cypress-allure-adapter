import { TestData } from '@test-utils';
import { basename } from 'path';
import { visitHtmlCode } from './visit-html';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', { defaultCommandTimeout: 300 },() => {
  ${visitHtmlCode}
  
  it('test 1', () => {
    cy.get('[data-test-id="item"]').should('contain', 'NonExistent');
  });
});
    `,

  expect: {
    testsNames: [`${rootSuite} test 1`],

    testStatuses: [
      {
        testName: 'test 1',
        index: 0,
        status: 'failed',
        statusDetails: {
          message: [
            "Timed out retrying after 300ms: expected '[ <div>, 4 more... ]' to contain 'NonExistent'",
          ],
        },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'should have no attachments',
        testName: 'test 1',
        index: 0,
        attachments: [
          {
            name: 'data-assertions-one-failed-for-command.ts -- test 1 (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
      },
    ],

    testSteps: [
      {
        testName: 'test 1',
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
            name: 'get: div',
            status: 'failed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'assert: expected **[ <div>, 4 more... ]** to contain **NonExistent**',
                status: 'failed',
                statusDetails: {},
                steps: [],
              },
            ],
          },
        ],
      },
    ],
  },
};

export default data;
