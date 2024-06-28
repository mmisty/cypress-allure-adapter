import { TestData } from '@test-utils';

const rootSuite = 'Failed before hook in nested suite (complex)';

const data: TestData = {
  /**
   * When hook in child suite fails
   *  - result should have proper suite structure
   *  - attachments
   *  - steps
   *  - video in tear down
   */
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `describe('${rootSuite}', () => {
      it('test 0', () => {
        cy.log('test 1');
      });

      describe('hooks test - child', () => {
        describe('hooks test - sub child', () => {
          before('in sub suite', () => {
            throw new Error('Failure in hook');
          });

          it('test 1', () => {
            cy.log('test 1');
          });

          it('test 2', () => {
            cy.log('test 2');
          });
        });
      });
    });
    `,

  expect: {
    testsNames: [
      `${rootSuite} hooks test - child hooks test - sub child test 1`,
      `${rootSuite} hooks test - child hooks test - sub child test 2`,
      `${rootSuite} test 0`,
    ],

    testStatuses: [
      {
        testName: 'test 0',
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 1',
        status: 'failed',
        statusDetails: {
          message: [
            'Failure in hook',
            '',
            'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `hooks test - sub child`',
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
            'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `hooks test - sub child`',
          ],
        },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'should have no attachments',
        testName: 'test 0',
        attachments: [],
      },
      {
        expectMessage: 'todo check later',
        testName: 'test 1',
        attachments: [],
      }, // todo check later
      { expectMessage: '', testName: 'test 2', attachments: [] }, // todo check later
    ],

    labels: {
      filter: ['suite', 'parentSuite', 'subSuite'],
      expected: [
        {
          name: 'test 0',
          labels: [
            {
              name: 'parentSuite',
              value: rootSuite,
            },
            //{ name: 'suite', value: 'hooks test - child' },
          ],
        },
        {
          name: 'test 1',
          labels: [
            {
              name: 'parentSuite',
              value: rootSuite,
            },
            { name: 'suite', value: 'hooks test - child' },
            { name: 'subSuite', value: 'hooks test - sub child' },
          ],
        },
        {
          name: 'test 2',
          labels: [
            {
              name: 'parentSuite',
              value: rootSuite,
            },
            { name: 'suite', value: 'hooks test - child' },
            { name: 'subSuite', value: 'hooks test - sub child' },
          ],
        },
      ],
    },

    parents: [
      {
        testName: 'test 0',
        containers: [
          {
            name: rootSuite,
            befores: [],
            afters: [
              {
                name: 'video',
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
                    name: 'test_0_number.cy.ts.mp4',
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
              },
            ],
          },
          { name: 'hooks test - child', befores: [], afters: [] },
          { name: 'hooks test - sub child', befores: [], afters: [] },
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
                    name: 'test_0_number.cy.ts.mp4',
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
              },
            ],
          },
          { name: 'hooks test - child', befores: [], afters: [] },
          { name: 'hooks test - sub child', befores: [], afters: [] },
        ],
      },
    ],

    events: [
      'mocha: start',
      'mocha: suite: , ',
      'mocha: hook: "before all" hook',
      'cypress: test:before:run: test 0',
      'mocha: hook end: "before all" hook',
      `mocha: suite: ${rootSuite}, ${rootSuite}`,
      'mocha: test: test 0',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: pass: test 0',
      'mocha: test end: test 0',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: test 0',
      'plugin test:ended',
      `mocha: suite: hooks test - child, ${rootSuite} hooks test - child`,
      `mocha: suite: hooks test - sub child, ${rootSuite} hooks test - child hooks test - sub child`,
      'mocha: hook: "before all" hook: in sub suite',
      'cypress: test:before:run: test 1',
      `cypress:screenshot:test:${rootSuite} -- hooks test - child -- hooks test - sub child -- test 1 -- before all hook in sub suite (failed).png`,
      'mocha: fail: "before all" hook: in sub suite for "test 1"',
      'mocha: suite end: hooks test - sub child',
      'mocha: suite end: hooks test - child',
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
