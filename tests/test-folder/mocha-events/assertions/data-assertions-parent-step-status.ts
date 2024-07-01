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
    cy.allure().startStep('step P0');
    cy.allure().endStep();
    
    cy.allure().startStep('step P');
    
    cy.allure().startStep('step C 1');
    cy.allure().startStep('step CC 1');
    cy.allure().endStep();
    cy.allure().endStep();
    
    cy.allure().startStep('step C 2');
    cy.allure().startStep('step CC 2');
    cy.allure().endStep('failed', { message: "Sub step failed" });
    cy.allure().endStep();
    
    
    cy.allure().startStep('step C 3');
    cy.allure().endStep();
    
    cy.allure().endStep();
    cy.allure().startStep('step P2');
    cy.allure().endStep();
  });
});
    `,

  expect: {
    testsNames: [`${rootSuite} test 1`],

    testStatuses: [
      {
        testName: 'test 1',
        index: 0,
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
    ],

    testAttachments: [
      {
        expectMessage: 'should have no attachments',
        testName: 'test 1',
        index: 0,
        attachments: [],
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
            name: 'step P0',
            status: 'passed',
            statusDetails: {},
            steps: [],
          },
          {
            attachments: [],
            name: 'step P',
            // should be broken when children have non-success
            status: 'broken',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'step C 1',
                status: 'passed',
                statusDetails: {},
                steps: [
                  {
                    attachments: [],
                    name: 'step CC 1',
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                  },
                ],
              },
              {
                attachments: [],
                name: 'step C 2',
                status: 'broken',
                statusDetails: {},
                steps: [
                  {
                    attachments: [],
                    name: 'step CC 2',
                    status: 'failed',
                    statusDetails: {
                      message: 'Sub step failed',
                    },
                    steps: [],
                  },
                ],
              },
              {
                attachments: [],
                name: 'step C 3',
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
            ],
          },
          {
            attachments: [],
            name: 'step P2',
            status: 'passed',
            statusDetails: {},
            steps: [],
          },
        ],
      },
    ],
  },
};

export default data;
