import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;
const tests = 3;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite} @beforeEachRetry', { retries: 1 }, () => {

  beforeEach('Named hook', () => {
    cy.log('before each');
    cy.wrap(null).then(() => {
      throw new Error('BEFORE EACH FAIL');
    });
  });

  it('test 01', () => {
    cy.log('test 1');
  });
  
  it('test 02', () => {
    cy.log('test 2');
  });
  
  it('test 03', () => {
    cy.log('test 2');
  });
});
    `,

  expect: {
    testsNames: [
      `${rootSuite} test 01`,
      `${rootSuite} test 01`,
      `${rootSuite} test 02`,
      `${rootSuite} test 03`,
    ],

    testStatuses: [
      {
        testName: 'test 01',
        index: 0,
        status: 'failed',
        statusDetails: {
          message: ['BEFORE EACH FAIL'],
        },
      },
      {
        testName: 'test 01',
        index: 1,
        status: 'failed',
        statusDetails: {
          message: [
            'BEFORE EACH FAIL',
            '',
            'Because this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `data-before-each-retry-fail.ts`',
          ],
        },
      },
      {
        testName: 'test 02',
        index: 0,
        status: 'unknown',
        statusDetails: {
          message: [
            'BEFORE EACH FAIL',
            '',
            'Because this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `data-before-each-retry-fail.ts`',
          ],
        },
      },
      {
        testName: 'test 03',
        index: 0,
        status: 'unknown',
        statusDetails: {
          message: [
            'BEFORE EACH FAIL',
            '',
            'Because this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `data-before-each-retry-fail.ts`',
          ],
        },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'should have attachments',
        testName: 'test 01',
        index: 0,
        attachments: [
          {
            name: 'data-before-each-retry-fail.ts -- test 01 (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
      },
      {
        expectMessage: 'no',
        testName: 'test 01',
        index: 1,
        attachments: [
          {
            name: 'data-before-each-retry-fail.ts -- test 01 -- before each hook Named hook (failed) (attempt 2).png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
      },
      {
        expectMessage: 'should have no attachments',
        testName: 'test 02',
        index: 0,
        attachments: [],
      },
      {
        expectMessage: 'should have no attachments',
        testName: 'test 03',
        index: 0,
        attachments: [],
      },
    ],

    testSteps: [
      {
        testName: 'test 01',
        index: 0,
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
            steps: [],
          },
          {
            attachments: [],
            name: '"before each" hook: Named hook',
            status: 'passed',
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
      {
        testName: 'test 01',
        index: 1,
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
            steps: [],
          },
          {
            attachments: [],
            name: '"before each" hook: Named hook',
            status: 'passed',
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
      {
        testName: 'test 02',
        index: 0,
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [],
      },
    ],

    parents: [
      {
        testName: 'test 01',
        index: 0,
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
        testName: 'test 01',
        index: 1,
        containers: [
          {
            name: rootSuite,
            befores: [],
            afters: [
              {
                name: 'video',
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
        testName: 'test 02',
        index: 0,
        containers: [
          {
            name: rootSuite,
            befores: [],
            afters: [
              {
                name: 'video',
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
    ],

    events: [
      'mocha: start',
      'mocha: suite: , ',
      'mocha: hook: "before all" hook',
      'cypress: test:before:run: test 01',
      'mocha: hook end: "before all" hook',
      'mocha: suite: data-before-each-retry-fail.ts, data-before-each-retry-fail.ts',
      'mocha: test: test 01',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: Named hook',
      'mocha: hook end: "before each" hook: Named hook',
      'cypress:screenshot:test:data-before-each-retry-fail.ts -- test 01 (failed).png',
      'mocha: retry: test 01',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: test 01',
      'plugin test:ended',
      'mocha: test: test 01',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: test 01',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: Named hook',
      'cypress:screenshot:test:data-before-each-retry-fail.ts -- test 01 -- before each hook Named hook (failed) (attempt 2).png',
      'mocha: fail: "before each" hook: Named hook for "test 01"',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: test 01',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'mocha: suite end: data-before-each-retry-fail.ts',
      'cypress: test:before:run: test 03',
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;
