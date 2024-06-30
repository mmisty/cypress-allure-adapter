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
    afterEach(() => {
      cy.log('after each');
      cy.wrap(null).then(() => {
        throw new Error('fail in after each')
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
            'fail in after each',
            '',
            'Because this error occurred during a `after each` hook we are skipping the remaining tests in the current suite: `child suite`',
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
            name: `${rootSuite} -- child suite -- test 1 -- after each hook (failed).png`,
            source: 'source.png',
            type: 'image/png',
          },
        ],
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
            {
              name: 'suite',
              value: 'child suite',
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
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
            steps: [],
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
            status: 'failed',
            steps: [
              {
                attachments: [],
                name: 'log: after each',
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
      'mocha: pass: test 1',
      'mocha: test end: test 1',
      'mocha: hook: "after each" hook',
      `cypress:screenshot:test:${rootSuite} -- child suite -- test 1 -- after each hook (failed).png`,

      'mocha: fail: "after each" hook for "test 1"',
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
