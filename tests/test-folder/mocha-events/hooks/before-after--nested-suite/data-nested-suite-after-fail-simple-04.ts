import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
  describe('${rootSuite}', () => {
      describe('child suite', () => {
          after('in sub suite', () => {
            cy.log('hook pass');
            cy.wrap(null).then(() => {
              throw new Error('Failure in hook');
            });
          });

          it('test 1', () => {
            cy.log('test 1');
          });

          it('test 2', () => {
            cy.log('test 2');
          });
        });
  });
  `,

  expect: {
    testsNames: [
      `${rootSuite} child suite test 1`,
      `${rootSuite} child suite test 2`,
    ],

    testStatuses: [
      {
        testName: 'test 1',
        status: 'passed',
        statusDetails: { message: undefined },
      },
      {
        testName: 'test 2',
        status: 'failed',
        statusDetails: {
          message: [
            'Failure in hook',
            '',
            'Because this error occurred during a `after all` hook we are skipping the remaining tests in the current suite: `child suite`',
          ],
        },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'should be no',
        testName: 'test 1',
        attachments: [],
      },
      {
        expectMessage: 'should be screenshot of failure',
        testName: 'test 2',
        attachments: [
          {
            name: `${rootSuite} -- child suite -- test 2 -- after all hook in sub suite (failed).png`,
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
            name: '"before each" hooks (2)',
            status: 'passed',
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
                name: '"before each" hook',
                status: 'passed',
                steps: [],
                attachments: [],
              },
            ],
          },
          {
            name: 'log: test 1',
            status: 'passed',
            steps: [],
            attachments: [],
          },
          {
            name: '"after each" hook',
            status: 'passed',
            steps: [],
            attachments: [],
          },
        ],
      },
      {
        testName: 'test 2',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [
          {
            name: '"before each" hooks (2)',
            status: 'passed',
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
                name: '"before each" hook',
                status: 'passed',
                steps: [],
                attachments: [],
              },
            ],
          },
          {
            name: 'log: test 2',
            status: 'passed',
            steps: [],
            attachments: [],
          },
          {
            name: '"after each" hook',
            status: 'passed',
            steps: [],
            attachments: [],
          },
        ],
      },
    ],

    testParents: [
      {
        testName: 'test 1',
        parents: [
          { name: 'child suite', parent: rootSuite },
          { name: rootSuite, parent: undefined },
        ],
      },
      {
        testName: 'test 2',
        parents: [
          { name: 'child suite', parent: rootSuite },
          { name: rootSuite, parent: undefined },
        ],
      },
    ],

    labels: {
      filter: ['suite', 'parentSuite', 'subSuite'],
      expected: [
        {
          name: 'test 1',
          labels: [
            { name: 'parentSuite', value: rootSuite },
            { name: 'suite', value: 'child suite' },
          ],
        },
        {
          name: 'test 2',
          labels: [
            { name: 'parentSuite', value: rootSuite },
            { name: 'suite', value: 'child suite' },
          ],
        },
      ],
    },

    parents: [
      {
        testName: 'test 1',
        containers: [
          {
            name: rootSuite,
            befores: [],
            afters: [],
          },
          {
            name: 'child suite',
            stepMap: x => ({
              name: x.name,
              status: x.status,
              attachments: x.attachments,
            }),
            befores: [],
            afters: [
              {
                name: '"after all" hook: in sub suite',
                attachments: [],
                steps: [
                  {
                    name: 'log: hook pass',
                    status: 'passed',
                    steps: [],
                    attachments: [],
                  },
                  {
                    name: 'wrap',
                    status: 'passed',
                    steps: [],
                    attachments: [],
                  },
                ],
              },
              {
                name: 'video',
                attachments: [
                  {
                    name: 'test_0_number.cy.ts.mp4',
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
                steps: [],
              },
            ],
          },
        ],
      },
      {
        testName: 'test 2',
        containers: [
          {
            name: rootSuite,
            befores: [],
            afters: [],
          },
          {
            name: 'child suite',
            stepMap: x => ({
              name: x.name,
              status: x.status,
              attachments: x.attachments,
            }),
            befores: [],
            afters: [
              {
                name: '"after all" hook: in sub suite',
                attachments: [],
                steps: [
                  {
                    name: 'log: hook pass',
                    steps: [],
                    status: 'passed',
                    attachments: [],
                  },
                  {
                    name: 'wrap',
                    status: 'passed',
                    steps: [],
                    attachments: [],
                  },
                ],
              },
              {
                name: 'video',
                attachments: [
                  {
                    name: 'test_0_number.cy.ts.mp4',
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
                steps: [],
              },
            ],
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
      `mocha: suite: child suite, ${rootSuite} child suite`,
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
      'cypress: test:after:run: test 1',
      'plugin test:ended',

      'mocha: test: test 2',
      'plugin test:started',
      'mocha: hook: "before each" hook: [cypress-allure-adapter]',
      'cypress: test:before:run: test 2',
      'mocha: hook end: "before each" hook: [cypress-allure-adapter]',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: pass: test 2',
      'mocha: test end: test 2',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'mocha: hook: "after all" hook: in sub suite',
      `cypress:screenshot:test:${rootSuite} -- child suite -- test 2 -- after all hook in sub suite (failed).png`,
      'mocha: fail: "after all" hook: in sub suite for "test 2"',
      'mocha: suite end: child suite',
      `mocha: suite end: ${rootSuite}`,
      'cypress: test:after:run: test 2',
      'plugin test:ended', // does nothing
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;
