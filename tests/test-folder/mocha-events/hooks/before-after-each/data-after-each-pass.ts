import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', () => {
  afterEach(() => {
    cy.log('no name hook - after each');
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
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'should have no attachments',
        testName: 'test 1',
        attachments: [],
      },
    ],

    labels: {
      filter: ['suite', 'parentSuite', 'subSuite'],
      expected: [
        {
          labels: [
            {
              name: 'parentSuite',
              value: rootSuite,
            },
          ],
          name: 'test 1',
        },
      ],
    },

    testSteps: [
      {
        testName: 'test 1',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [
          {
            name: '"before each" hooks',
            status: 'passed',
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
            ],
          },
          {
            attachments: [],
            name: 'log: test 1',
            status: 'passed',
            steps: [],
          },
          {
            name: '"after each" hooks',
            status: 'passed',
            attachments: [],
            steps: [
              {
                attachments: [],
                name: '"after each" hook',
                status: 'passed',
                steps: [
                  {
                    attachments: [],
                    name: 'log: no name hook - after each',
                    status: 'passed',
                    steps: [],
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
      },
    ],

    parents: [
      {
        testName: 'test 1',
        containers: [
          {
            name: rootSuite,
            befores: [],
            afters: [],
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
      'mocha: pass: test 1',
      'mocha: test end: test 1',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
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
