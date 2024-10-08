import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', () => {
  beforeEach('named before each', () => {
    cy.log('before each');
    cy.wrap(null).then(() => {
      throw new Error('fail in before each')
    });
  });

  it('test 1', () => {
    cy.log('test 1');
  });
});
    `,

  expect: {
    testsNames: [`${rootSuite} test 1`],

    testStatuses: [
      {
        testName: 'test 1',
        status: 'failed',
        statusDetails: {
          message: [
            'fail in before each',
            '',
            `Because this error occurred during a \`before each\` hook we are skipping the remaining tests in the current suite: \`${rootSuite}\``,
          ],
        },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'should have no attachments',
        testName: 'test 1',
        attachments: [
          {
            name: `${rootSuite} -- test 1 -- before each hook named before each (failed).png`,
            source: 'source.png',
            type: 'image/png',
          },
        ],
      },
    ],

    testSteps: [
      {
        testName: 'test 1',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [
          {
            name: '"before each" hooks',
            status: 'failed',
            attachments: [],
            steps: [
              {
                name: '"before each" hook: [cypress-allure-adapter]',
                status: 'passed',
                attachments: [],
                steps: [
                  {
                    attachments: [],
                    name: 'will not intercept requests to save bodies',
                    status: 'passed',
                    steps: [],
                  },
                ],
              },
              {
                attachments: [],
                name: '"before each" hook',
                status: 'passed',
                steps: [],
              },
              {
                attachments: [],
                name: '"before each" hook: named before each',
                status: 'failed',
                steps: [
                  {
                    attachments: [],
                    name: 'log: before each',
                    status: 'passed',
                    steps: [],
                  },
                  {
                    attachments: [],
                    name: 'wrap',
                    status: 'failed',
                    steps: [],
                  },
                ],
              },
            ],
          },
          {
            attachments: [],
            name: '"after each" hook',
            status: 'passed',
            steps: [],
          },
        ],
      },
    ],

    parents: [
      {
        testName: 'test 1',
        containers: [
          {
            name: rootSuite,
            befores: [],
            afters: [{ name: 'video' }],
          },
        ],
      },
    ],

    events: [
      'mocha: start',
      'mocha: suite: , ',
      'mocha: hook: "before all" hook',
      'cypress: test:before:run: test 1',
      'mocha: hook end: "before all" hook',
      `mocha: suite: ${rootSuite}, ${rootSuite}`,
      'mocha: test: test 1',
      'plugin test:started',
      'mocha: hook: "before each" hook: [cypress-allure-adapter]',
      'mocha: hook end: "before each" hook: [cypress-allure-adapter]',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: named before each',
      `cypress:screenshot:test:${rootSuite} -- test 1 -- before each hook named before each (failed).png`,
      'mocha: fail: "before each" hook: named before each for "test 1"',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      `mocha: suite end: ${rootSuite}`,
      'cypress: test:after:run: test 1',
      'plugin test:ended',
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;
