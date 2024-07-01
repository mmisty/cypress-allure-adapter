import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', { defaultCommandTimeout: 300 },() => {
  
  it('test 1', () => {
    expect(0).eq(0);
  });
  
  it('test 2 - warning', () => {
    Cypress.log({name: 'WARNING', message: 'some warn'});
  });
  
  it('test 3 - log', () => {
    Cypress.log({name: 'some log', message: 'some message'});
  });
  
  it('test 4 - several', () => {
    expect(0).eq(0);
    expect(0).eq(1);
  });
});
    `,

  expect: {
    testsNames: [
      `${rootSuite} test 1`,
      `${rootSuite} test 2 - warning`,
      `${rootSuite} test 3 - log`,
      `${rootSuite} test 4 - several`,
    ],

    testStatuses: [
      {
        testName: 'test 1',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 2 - warning',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 3 - log',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 4 - several',
        index: 0,
        status: 'failed',
        statusDetails: {
          message: ['expected 0 to equal 1'],
        },
      },
    ],

    testSteps: [
      {
        testName: 'test 1',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetails: m.statusDetails,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'assert: expected **0** to equal **0**',
            status: 'passed',
            statusDetails: {},
            steps: [],
          },
        ],
      },

      {
        testName: 'test 2 - warning',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetails: m.statusDetails,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),

        expected: [
          {
            attachments: [],
            name: 'WARNING: some warn',
            status: 'broken',
            statusDetails: {},
            steps: [],
          },
        ],
      },
      {
        testName: 'test 3 - log',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetails: m.statusDetails,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),

        expected: [
          {
            attachments: [],
            name: 'some log: some message',
            status: 'passed',
            statusDetails: {},
            steps: [],
          },
        ],
      },
      {
        testName: 'test 4 - several',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetails: m.statusDetails,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),

        expected: [
          {
            attachments: [],
            name: 'assert: expected **0** to equal **0**',
            status: 'passed',
            statusDetails: {},
            steps: [],
          },
          {
            attachments: [],
            name: 'assert: expected **0** to equal **1**',
            status: 'failed',
            statusDetails: {},
            steps: [],
          },
        ],
      },
    ],
  },
};

export default data;
