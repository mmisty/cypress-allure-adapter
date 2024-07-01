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
    cy.get('div')
      .should('contain', 'Orange')
      .should('contain', 'Tropical Fruit')
      .should('not.contain', 'Lichi'); // first pass, then start to fail when Lichi appears
  });
  
  it('test 2', { defaultCommandTimeout: 300 }, () => {
    let i = 0;
    cy.get('div').should(() => {
      i++;

      expect(i < 10 ? 1 : 0).eq(0);
      expect(1).eq(1);
      expect(1, 'always fail').eq(2);
    });
  });
});
    `,

  expect: {
    testsNames: [`${rootSuite} test 1`, `${rootSuite} test 2`],

    testStatuses: [
      {
        testName: 'test 1',
        index: 0,
        status: 'failed',
        statusDetails: {
          message: [
            "Timed out retrying after 1000ms: expected '[ <div>, 18 more... ]' not to contain 'Lichi'",
          ],
        },
      },
      {
        testName: 'test 2',
        index: 0,
        status: 'failed',
        statusDetails: {
          message: [
            'Timed out retrying after 300ms: always fail: expected 1 to equal 2',
          ],
        },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'should have attachments',
        testName: 'test 1',
        index: 0,
        attachments: [
          {
            name: 'data-assertions-several-failed-for-command.ts -- test 1 (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
      },
      {
        expectMessage: 'should have attachments',
        testName: 'test 2',
        index: 0,
        attachments: [
          {
            name: 'data-assertions-several-failed-for-command.ts -- test 2 (failed).png',
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
                name: 'assert: expected **[ <div>, 18 more... ]** to contain **Orange**',
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
              {
                attachments: [],
                name: 'assert: expected **[ <div>, 18 more... ]** to contain **Tropical Fruit**',
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
              {
                attachments: [],
                name: 'assert: expected **[ <div>, 18 more... ]** not to contain **Lichi**',
                status: 'failed',
                statusDetails: {},
                steps: [],
              },
            ],
          },
        ],
      },

      {
        testName: 'test 2',
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
                name: 'assert: expected **0** to equal **0**',
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
              {
                attachments: [],
                name: 'assert: expected **1** to equal **1**',
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
              {
                attachments: [],
                name: 'assert: always fail: expected **1** to equal **2**',
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
