import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
describe('${rootSuite}', { defaultCommandTimeout: 300 },() => {
  it('test 1 - pass', () => {
     cy.origin('https://google.com/', { args: { username: 'testTas' } }, ({ username }) => {
        cy.log(username);
     });
  });
});
    `,

  expect: {
    testsNames: [`${rootSuite} test 1 - pass`],

    testStatuses: [
      {
        testName: 'test 1 - pass',
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
            name: 'origin: https://google.com/, {args: {username: "testTas"}}',
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'origin: https://google.com/',
                status: 'passed',
                statusDetails: {},
                steps: [
                  {
                    attachments: [],
                    name: 'log: testTas',
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
    ],
  },
};

export default data;
