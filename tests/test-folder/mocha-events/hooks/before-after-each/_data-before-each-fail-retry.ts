import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}: before each fail with retry.`;
const tests = 5;

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

  afterEach(() => {
    cy.log('log after each');
  });

  afterEach('Named after', () => {
    cy.log('log after each');
  });

  after(() => {
    cy.log('after');
  });

  after('named hook all after', () => {
    cy.log('after');
  });
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
      `${rootSuite} test 04`,
      `${rootSuite} test 04`,
      `${rootSuite} test 05`,
      `${rootSuite} test 05`,
    ],

    testStatuses: [
      {
        testName: 'test 01',
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 01',
        status: 'failed',
        statusDetails: {
          message: [
            'Failure in hook',
            '',
            'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `hooks test - sub child` (added by [cypress-allure-adapter])',
          ],
        },
      },
      {
        testName: 'test 02',
        status: 'passed',
        statusDetails: {
          message: undefined,
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

    testSteps: [
      {
        testName: 'test 01',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [],
      },
      {
        testName: 'test 02',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        expected: [],
      },
    ],

    parents: [
      {
        testName: 'test 01',
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
          {
            name: 'hooks test - child',
            befores: [{ name: '"before all" hook', attachments: [] }],
            afters: [],
          },
          {
            name: 'hooks test - sub child',
            befores: [
              {
                name: '"before all" hook',
                attachments: [],
              },
              {
                name: '"before all" hook: in sub suite',
                attachments: [
                  {
                    name: `${rootSuite} -- hooks test - child -- hooks test - sub child -- test 1 -- before all hook in sub suite (failed).png`,
                    source: 'source.png',
                    type: 'image/png',
                  },
                ],
              },
            ],
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
        containers: [
          {
            name: rootSuite,
            befores: [],
            afters: [
              {
                name: 'video',
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
          {
            name: 'hooks test - child',
            befores: [{ name: '"before all" hook', attachments: [] }],
            afters: [],
          },
          {
            name: 'hooks test - sub child',
            befores: [
              {
                name: '"before all" hook',
                attachments: [],
              },
              {
                name: '"before all" hook: in sub suite',
                attachments: [
                  {
                    name: `${rootSuite} -- hooks test - child -- hooks test - sub child -- test 1 -- before all hook in sub suite (failed).png`,
                    source: 'source.png',
                    type: 'image/png',
                  },
                ],
              },
            ],
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
  },
};

export default data;
