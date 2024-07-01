import { TestData } from '@test-utils';
import { basename } from 'path';
import { visitHtmlCode } from './visit-html';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', { defaultCommandTimeout: 1000 },() => {
  ${visitHtmlCode}
  
  it('test 1', () => {
    cy.get('div').should('contain', 'Tropical Fruit');
  });
});
    `,

  expect: {
    testsNames: [`${rootSuite} test 1`],

    testStatuses: [
      {
        testName: 'test 1',
        index: 0,
        status: 'passed',
        statusDetails: { message: undefined },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'should have no attachments',
        testName: 'test 1',
        index: 0,
        attachments: [],
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
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'assert: expected **[ <div>, 16 more... ]** to contain **Tropical Fruit**',
                status: 'passed',
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
