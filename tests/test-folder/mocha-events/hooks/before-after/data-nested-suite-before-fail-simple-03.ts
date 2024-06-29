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
          before('in sub suite', () => {
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
        status: 'failed',
        statusDetails: {
          message: [
            'Failure in hook',
            '',
            'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `child suite` (added by [cypress-allure-adapter])',
          ],
        },
      },
      {
        testName: 'test 2',
        status: 'unknown',
        statusDetails: {
          message: [
            'Failure in hook',
            '',
            'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `child suite` (added by [cypress-allure-adapter])',
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
      { expectMessage: 'should be no', testName: 'test 2', attachments: [] },
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
            befores: [
              {
                name: '"before all" hook: in sub suite',
                attachments: [
                  {
                    name: `${rootSuite} -- child suite -- test 1 -- before all hook in sub suite (failed).png`,
                    source: 'source.png',
                    type: 'image/png',
                  },
                ],
                steps: [
                  {
                    attachments: [],
                    name: 'log: hook pass',
                    status: 'passed',
                    steps: [],
                  },
                  {
                    attachments: [],
                    name: 'wrap',
                    status: 'passed',
                    steps: [],
                  },
                ],
              },
            ],
            afters: [
              {
                name: 'video',
                steps: [],
                attachments: [
                  {
                    name: 'test_0_number.cy.ts.mp4',
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
            befores: [
              {
                name: '"before all" hook: in sub suite',
                steps: [
                  {
                    attachments: [],
                    name: 'log: hook pass',
                    status: 'passed',
                    steps: [],
                  },
                  {
                    attachments: [],
                    name: 'wrap',
                    status: 'passed',
                    steps: [],
                  },
                ],
                attachments: [
                  {
                    name: `${rootSuite} -- child suite -- test 1 -- before all hook in sub suite (failed).png`,
                    source: 'source.png',
                    type: 'image/png',
                  },
                ],
              },
            ],
            afters: [
              {
                name: 'video',
                steps: [],
                attachments: [
                  {
                    name: 'test_0_number.cy.ts.mp4',
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
      `mocha: suite: child suite, ${rootSuite} child suite`,
      'mocha: hook: "before all" hook: in sub suite',
      `cypress:screenshot:test:${rootSuite} -- child suite -- test 1 -- before all hook in sub suite (failed).png`,
      'mocha: fail: "before all" hook: in sub suite for "test 1"',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'mocha: suite end: child suite',
      `mocha: suite end: ${rootSuite}`,
      'cypress: test:after:run: test 1',
      'plugin test:ended', // does nothing
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;
