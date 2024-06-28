import { TestData } from '@test-utils';

const rootSuite = 'Failed before hook in nested suite (simple)';

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
            'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `child suite`',
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
            'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `child suite`',
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

    parents: [
      {
        testName: 'test 1',
        containers: [
          {
            name: rootSuite,
            befores: [],
            afters: [
              {
                name: 'video',
                attachments: [
                  {
                    name: 'test_2_number.cy.ts.mp4',
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
              },
            ],
          },
          {
            name: 'child suite',
            befores: [
              { name: '"before all" hook', attachments: [] },
              { name: '"before all" hook: in sub suite', attachments: [] },
            ],
            afters: [
              {
                name: 'video',
                attachments: [
                  {
                    name: 'test_2_number.cy.ts.mp4',
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
            afters: [
              {
                name: 'video',
                attachments: [
                  {
                    name: 'test_2_number.cy.ts.mp4',
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
              },
            ],
          },
          {
            name: 'child suite',
            befores: [
              { name: '"before all" hook', attachments: [] },
              { name: '"before all" hook: in sub suite', attachments: [] },
            ],
            afters: [
              {
                name: 'video',
                attachments: [
                  {
                    name: 'test_2_number.cy.ts.mp4',
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
      'mocha: suite end: child suite',
      `mocha: suite end: ${rootSuite}`,
      'cypress: test:after:run: test 1',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;
