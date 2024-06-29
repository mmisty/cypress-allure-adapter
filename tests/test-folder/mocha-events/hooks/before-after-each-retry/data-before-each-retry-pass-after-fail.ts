import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;
const tests = 3;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite} @beforeEachRetry', { retries: 2 }, () => {
  beforeEach(() => {
    cy.log('no name hook - before each');
  });

  beforeEach('Named hook', () => {
    cy.log('before each');

    if (Cypress.currentRetry < 1) {
      cy.wrap(null).then(() => {
        throw new Error('BEFORE EACH FAIL');
      });
    }
  });

  for (let i = 1; i <= ${tests}; i++) {
    it('test ' + ('0'+i).slice(-2), () => {
      cy.log('test ' + i);
    });
  }
});
    `,

  expect: {
    testsNames: [
      `${rootSuite} test 01`,
      `${rootSuite} test 01`,
      `${rootSuite} test 02`,
      `${rootSuite} test 02`,
      `${rootSuite} test 03`,
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
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 02',
        index: 0,
        status: 'failed',
        statusDetails: {
          message: ['BEFORE EACH FAIL'],
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
            name: 'data-before-each-retry-pass-after-fail.ts -- test 01 (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
      },
      {
        expectMessage: 'no',
        testName: 'test 01',
        index: 1,
        attachments: [],
      },
      {
        expectMessage: 'should have attachments',
        testName: 'test 02',
        index: 0,
        attachments: [
          {
            name: 'data-before-each-retry-pass-after-fail.ts -- test 02 (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
      },
      {
        expectMessage: 'should have no attachments',
        testName: 'test 02',
        index: 1,
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
            name: '"before each" hook',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'log: no name hook - before each',
                status: 'passed',
                steps: [],
              },
            ],
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
            name: '"before each" hook',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'log: no name hook - before each',
                status: 'passed',
                steps: [],
              },
            ],
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
            ],
          },
          {
            attachments: [],
            name: 'log: test 1',
            status: 'passed',
            steps: [],
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
                    name: 'test_1_number.cy.ts.mp4',
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
                    name: 'test_1_number.cy.ts.mp4', // video check
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
      `mocha: suite: ${rootSuite}, ${rootSuite}`,
      'mocha: test: test 01',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: Named hook',
      'mocha: hook end: "before each" hook: Named hook',
      `cypress:screenshot:test:${rootSuite} -- test 01 (failed).png`,
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
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: Named hook',
      'mocha: hook end: "before each" hook: Named hook',
      'mocha: pass: test 01',
      'mocha: test end: test 01',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: test 01',
      'plugin test:ended',
      'mocha: test: test 02',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: test 02',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: Named hook',
      'mocha: hook end: "before each" hook: Named hook',
      `cypress:screenshot:test:${rootSuite} -- test 02 (failed).png`,
      'mocha: retry: test 02',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: test 02',
      'plugin test:ended',
      'mocha: test: test 02',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: test 02',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: Named hook',
      'mocha: hook end: "before each" hook: Named hook',
      'mocha: pass: test 02',
      'mocha: test end: test 02',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: test 02',
      'plugin test:ended',
      'mocha: test: test 03',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: test 03',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: Named hook',
      'mocha: hook end: "before each" hook: Named hook',
      `cypress:screenshot:test:${rootSuite} -- test 03 (failed).png`,
      'mocha: retry: test 03',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: test 03',
      'plugin test:ended',
      'mocha: test: test 03',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: test 03',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: Named hook',
      'mocha: hook end: "before each" hook: Named hook',
      'mocha: pass: test 03',
      'mocha: test end: test 03',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      `mocha: suite end: ${rootSuite}`,
      'cypress: test:after:run: test 03',
      'plugin test:ended',
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;
