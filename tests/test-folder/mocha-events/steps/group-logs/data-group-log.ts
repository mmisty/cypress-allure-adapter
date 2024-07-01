import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', { defaultCommandTimeout: 300 },() => {
  Cypress.Commands.add('group', cyCommands => {
    const log = Cypress.log({ name: 'my group name', message: 'my group msg', groupStart: true });
    cyCommands();
    cy.doSyncCommand(() => {
      Cypress.log({ groupEnd: true, emitOnly: true });
      log.end();
    });
  });
  
  
  it('test 1 - pass', () => {
    cy.group(() => {
      expect(0).eq(0);
    });
  });
  
  it('test 2 - fail', () => {
    cy.group(() => {
      expect(0).eq(1);
    });
  });
});
    `,

  expect: {
    testsNames: [`${rootSuite} test 1 - pass`, `${rootSuite} test 2 - fail`],

    testStatuses: [
      {
        testName: 'test 1 - pass',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: 'test 2 - fail',
        index: 0,
        status: 'failed',
        statusDetails: {
          message: ['expected 0 to equal 1'],
        },
      },
    ],

    testSteps: [
      {
        testName: 'test 1 - pass',
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
            name: 'group',
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'my group name: my group msg',
                status: 'passed',
                statusDetails: {},
                steps: [
                  {
                    attachments: [],
                    name: 'assert: expected **0** to equal **0**',
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        testName: 'test 2 - fail',
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
            name: 'group',
            status: 'failed',
            statusDetailsMsg: 'expected 0 to equal 1',
            steps: [
              {
                attachments: [],
                name: 'my group name: my group msg',
                status: 'failed',
                statusDetailsMsg: 'expected 0 to equal 1',
                steps: [
                  {
                    attachments: [],
                    name: 'assert: expected **0** to equal **1**',
                    status: 'failed',
                    steps: [],
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
