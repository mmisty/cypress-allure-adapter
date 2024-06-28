import { TestData } from '@test-utils';

const rootSuite = 'Failed before and after hook';

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `describe('${rootSuite}', () => {
      before('in suite', () => {
        throw new Error('Failure in before hook');
      });
      
      after('after in suite', () => {
        throw new Error('Failure in after hook');
      });

      it('test 1', () => {
        cy.log('test 1');
      });

      it('test 2', () => {
        cy.log('test 2');
      });
    });
    `,

  expect: {
    testsNames: [`${rootSuite} test 1`, `${rootSuite} test 2`],

    testStatuses: [
      {
        testName: 'test 1',
        status: 'failed',
        statusDetails: {
          message: [
            'Failure in before hook',
            '',
            `Because this error occurred during a \`before all\` hook we are skipping the remaining tests in the current suite: \`${rootSuite}\` (added by [cypress-allure-adapter])`,
          ],
        },
      },
      {
        testName: 'test 2',
        status: 'unknown',
        statusDetails: {
          message: [
            'Failure in before hook',
            '',
            `Because this error occurred during a \`before all\` hook we are skipping the remaining tests in the current suite: \`${rootSuite}\` (added by [cypress-allure-adapter])`,
          ],
        },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'todo check later',
        testName: 'test 1',
        attachments: [],
      },
      { expectMessage: '', testName: 'test 2', attachments: [] },
    ],

    labels: {
      filter: ['suite', 'parentSuite', 'subSuite'],
      expected: [
        {
          name: 'test 1',
          labels: [
            {
              name: 'parentSuite',
              value: rootSuite,
            },
          ],
        },
        {
          name: 'test 2',
          labels: [
            {
              name: 'parentSuite',
              value: rootSuite,
            },
          ],
        },
      ],
    },

    testSteps: [
      {
        testName: 'test 1',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [],
      },
      {
        testName: 'test 2',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [],
      },
    ],

    parents: [
      {
        testName: 'test 1',
        containers: [
          {
            name: rootSuite,
            stepMap: x => ({
              name: x.name,
              status: x.status,
              attachments: x.attachments,
            }),
            befores: [
              {
                name: '"before all" hook: in suite',
                steps: [],
                attachments: [
                  {
                    name: `${rootSuite} -- test 1 -- before all hook in suite (failed).png`,
                    source: 'source.png',
                    type: 'image/png',
                  },
                ],
              },
            ],
            afters: [
              {
                name: '"after all" hook: after in suite',
                steps: [],
                attachments: [
                  {
                    name: `${rootSuite} -- test 1 -- after all hook after in suite (failed).png`,
                    source: 'source.png',
                    type: 'image/png',
                  },
                ],
              },
              {
                name: 'video',
                steps: [],
                attachments: [
                  {
                    name: 'test_0_number.cy.ts.mp4', // video check
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
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
            stepMap: x => ({
              name: x.name,
              status: x.status,
              attachments: x.attachments,
            }),
            befores: [
              {
                name: '"before all" hook: in suite',
                steps: [],
                attachments: [
                  {
                    name: `${rootSuite} -- test 1 -- before all hook in suite (failed).png`,
                    source: 'source.png',
                    type: 'image/png',
                  },
                ],
              },
            ],
            afters: [
              {
                name: '"after all" hook: after in suite',
                steps: [],
                attachments: [
                  {
                    name: `${rootSuite} -- test 1 -- after all hook after in suite (failed).png`,
                    source: 'source.png',
                    type: 'image/png',
                  },
                ],
              },
              {
                name: 'video',
                steps: [],
                attachments: [
                  {
                    name: 'test_0_number.cy.ts.mp4', // change
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
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
      'mocha: hook: "before all" hook: in suite',
      `cypress:screenshot:test:${rootSuite} -- test 1 -- before all hook in suite (failed).png`,
      'mocha: fail: "before all" hook: in suite for "test 1"',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'mocha: hook: "after all" hook: after in suite',
      `cypress:screenshot:test:${rootSuite} -- test 1 -- after all hook after in suite (failed).png`,
      'mocha: fail: "after all" hook: after in suite for "test 1"',
      `mocha: suite end: ${rootSuite}`,
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;
