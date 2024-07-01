import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}',() => {
  it('test 1 with key and value @label', () => {
    cy.log('test');
  });
  
  it('test 2 with one value like feature @feature', () => {
    cy.log('test');
  });
  
  it('test 3 link @link', () => {
    cy.log('test');
  });
  
  it('test 4 issue @issue', () => {
    cy.log('test');
  });
 
});
    `,

  expect: {
    testsNames: [
      `${rootSuite} test 1 with key and value`,
      `${rootSuite} test 2 with one value like feature`,
      `${rootSuite} test 3 link`,
      `${rootSuite} test 4 issue`,
    ],

    testStatuses: [
      {
        testName: 'test 1 with key and value',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 2 with one value like feature',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 3 link',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 4 issue',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
    ],

    testSteps: [
      {
        testName: 'test 1 with key and value',
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
            name: 'WARNING: tag @label tag should have name and/or value: @label("myLabel","value")',
            status: 'broken',
            statusDetails: {},
            steps: [],
          },
          {
            attachments: [],
            name: 'log: test',
            status: 'passed',
            statusDetails: {},
            steps: [],
          },
        ],
      },
      {
        testName: 'test 2 with one value like feature',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetailsMsg: m.statusDetails?.message,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'WARNING: tag @feature tag should have value: @feature("value")',
            status: 'broken',
            steps: [],
          },
          {
            attachments: [],
            name: 'log: test',
            status: 'passed',
            steps: [],
          },
        ],
      },
      {
        testName: 'test 3 link',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetailsMsg: m.statusDetails?.message,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'WARNING: tag @link should have id or url: @link("idOrUrl")',
            status: 'broken',
            steps: [],
          },
          {
            attachments: [],
            name: 'log: test',
            status: 'passed',
            steps: [],
          },
        ],
      },
      {
        testName: 'test 4 issue',
        index: 0,
        mapStep: m => ({
          status: m.status,
          attachments: m.attachments,
          statusDetailsMsg: m.statusDetails?.message,
        }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'WARNING: tag @issue tag should have id: @issue("idOrUrl")',
            status: 'broken',
            steps: [],
          },
          {
            attachments: [],
            name: 'log: test',
            status: 'passed',
            steps: [],
          },
        ],
      },
    ],
  },
};

export default data;
