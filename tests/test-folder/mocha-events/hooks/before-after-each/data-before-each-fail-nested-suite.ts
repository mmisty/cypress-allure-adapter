import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', () => {
  describe('child suite', ()=> {
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
});
    `,

  expect: {
    testsNames: [`${rootSuite} child suite test 1`],

    testStatuses: [
      {
        testName: 'test 1',
        status: 'failed',
        statusDetails: {
          message: [
            'fail in before each',
            '',
            'Because this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `child suite`',
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
            name: `${rootSuite} -- child suite -- test 1 -- before each hook named before each (failed).png`,
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
      `mocha: suite: child suite, ${rootSuite} child suite`,
      'mocha: test: test 1',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: named before each',
      `cypress:screenshot:test:${rootSuite} -- child suite -- test 1 -- before each hook named before each (failed).png`,
      'mocha: fail: "before each" hook: named before each for "test 1"',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'mocha: suite end: child suite',
      `mocha: suite end: ${rootSuite}`,
      'cypress: test:after:run: test 1',
      'plugin test:ended',
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;