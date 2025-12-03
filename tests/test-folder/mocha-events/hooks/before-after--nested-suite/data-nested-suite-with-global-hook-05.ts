import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
  before('global before one', () => {
    cy.log('hook pass');
  });
  
  after('global after one', () => {
    cy.log('hook pass');
  });
  
  describe('${rootSuite}', () => {
    describe('child suite', () => {
      it('test 1', () => {
        cy.log('test 1');
      });
    });
    
    it('test 2', () => {
      cy.log('test 2');
    });
  });
  `,

  expect: {
    testsNames: [`${rootSuite} child suite test 1`, `${rootSuite} test 2`],

    testStatuses: [
      {
        testName: 'test 1',
        status: 'passed',
        statusDetails: { message: undefined },
      },
      {
        testName: 'test 2',
        status: 'passed',
        statusDetails: { message: undefined },
      },
    ],

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

    testAttachments: [
      {
        expectMessage: 'should be no',
        testName: 'test 1',
        attachments: [],
      },
      {
        expectMessage: 'should be no',
        testName: 'test 2',
        attachments: [],
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
        parents: [{ name: rootSuite, parent: undefined }],
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
          labels: [{ name: 'parentSuite', value: rootSuite }],
        },
      ],
    },

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
                name: '"before all" hook: global before one',
                attachments: [],
                steps: [
                  {
                    attachments: [],
                    name: 'log: hook pass',
                    status: 'passed',
                    steps: [],
                  },
                ],
              },
            ],
            afters: [
              {
                name: '"after all" hook: global after one',
                attachments: [],
                steps: [
                  {
                    attachments: [],
                    name: 'log: hook pass',
                    status: 'passed',
                    steps: [],
                  },
                ],
              },
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
          {
            name: 'child suite',
            stepMap: x => ({
              name: x.name,
              status: x.status,
              attachments: x.attachments,
            }),
            befores: [
              {
                name: '"before all" hook: global before one',
                attachments: [],
                // was issue #152, todo this check was moved
                steps: [
                  {
                    attachments: [],
                    name: 'log: hook pass',
                    status: 'passed',
                    steps: [],
                  },
                ],
              },
            ],
            afters: [
              // todo should be, issue #119
              // {
              //   name: '"after all" hook: global after one',
              //   attachments: [],
              //   steps: [
              //   {
              //     attachments: [],
              //     name: 'log: hook pass',
              //     status: 'passed',
              //     steps: [],
              //   },
              // ],
              // },
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
            stepMap: x => ({
              name: x.name,
              status: x.status,
              attachments: x.attachments,
            }),
            befores: [
              {
                name: '"before all" hook: global before one',
                attachments: [],
                steps: [
                  {
                    attachments: [],
                    name: 'log: hook pass',
                    status: 'passed',
                    steps: [],
                  },
                ],
              },
            ],
            afters: [
              {
                name: '"after all" hook: global after one',
                attachments: [],
                steps: [
                  {
                    attachments: [],
                    name: 'log: hook pass',
                    status: 'passed',
                    steps: [],
                  },
                ],
              },
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

      'cypress: test:before:run: test 2',
      'mocha: hook end: "before all" hook',
      'mocha: hook: "before all" hook: global before one',
      'mocha: hook end: "before all" hook: global before one',
      `mocha: suite: ${rootSuite}, ${rootSuite}`,
      'mocha: test: test 2',
      'plugin test:started',
      'mocha: hook: "before each" hook: [cypress-allure-adapter]',
      'mocha: hook end: "before each" hook: [cypress-allure-adapter]',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: pass: test 2',
      'mocha: test end: test 2',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: test 2',
      'plugin test:ended',

      `mocha: suite: child suite, ${rootSuite} child suite`,
      'mocha: test: test 1',
      'plugin test:started',
      'mocha: hook: "before each" hook: [cypress-allure-adapter]',
      'cypress: test:before:run: test 1',
      'mocha: hook end: "before each" hook: [cypress-allure-adapter]',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: pass: test 1',
      'mocha: test end: test 1',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'mocha: suite end: child suite',
      `mocha: suite end: ${rootSuite}`,
      'mocha: hook: "after all" hook: global after one',
      'mocha: hook end: "after all" hook: global after one',
      'cypress: test:after:run: test 1',
      'plugin test:ended',
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;
