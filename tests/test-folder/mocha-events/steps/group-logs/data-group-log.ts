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

  Cypress.Commands.add('endLogGroup', { prevSubject: 'optional' }, subject => {
    Cypress.log({ groupEnd: true, emitOnly: true });
    cy.wrap(subject, {log:false});
  });
  
  Cypress.Commands.add('withGroupping', (cyCommands) => {
    const log = Cypress.log({ name: 'withGroupping', groupStart: true, autoEnd: false });
    cyCommands();
    cy.wrap(null, {log:false}).then(()=> {
      log.error(new Error('TestE'));
    }).endLogGroup();
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


   it('test 4 - more nested', () => {
    
    cy.withGroupping(() => {
      cy.log('level 1');
      cy.withGroupping(() => {
        cy.log('level 2');
      });
    });

    cy.withGroupping(() => {
      cy.log('level 1 again');
    });
  });
});
    `,

  expect: {
    testsNames: [
      `${rootSuite} test 1 - pass`,
      `${rootSuite} test 2 - fail`,
      `${rootSuite} test 4 - more nested`,
    ],

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
      {
        testName: 'test 4 - more nested',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
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
              {
                attachments: [],
                name: 'doSyncCommand',
                status: 'passed',
                statusDetails: {},
                steps: [],
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

      {
        testName: 'test 4 - more nested',
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
            name: 'withGroupping',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'log: level 1',
                status: 'passed',
                steps: [],
              },
              {
                attachments: [],
                name: 'withGroupping',
                status: 'passed',
                steps: [
                  {
                    attachments: [],
                    name: 'log: level 2',
                    status: 'passed',
                    steps: [],
                  },
                  {
                    attachments: [],
                    name: 'endLogGroup',
                    status: 'passed',
                    steps: [],
                  },
                ],
              },
              {
                attachments: [],
                name: 'endLogGroup',
                status: 'passed',
                steps: [],
              },
            ],
          },
          {
            attachments: [],
            name: 'withGroupping',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'log: level 1 again',
                status: 'passed',
                steps: [],
              },
              {
                attachments: [],
                name: 'endLogGroup',
                status: 'passed',
                steps: [],
              },
            ],
          },
        ],
      },
    ],
  },
};

export default data;
