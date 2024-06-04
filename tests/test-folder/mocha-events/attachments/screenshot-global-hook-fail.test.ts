import {
  checkCyResults,
  createResTest2,
  fixResult,
  fullStepAttachment,
} from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('test screenshot when global before hook fails', () => {
  const res = createResTest2(
    [
      `
before(() => {
  cy.wrap(null).then(() => {
    throw new Error('On Purpose');
  });
});
  
describe('screenshot when global before hook fails @screen', () => {
  it('01 test', () => {
    cy.log('hello');
  });
  
   it('02 test', () => {
    cy.log('hello');
  });
});
`,
    ],
    { allureAddVideoOnPass: 'false', allureSkipCommands: 'screenshot' },
  );

  describe('check results', () => {
    let results: AllureTest[];
    let fixed: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
      fixed = fixResult(results);
    });

    it('check cypress results', () => {
      checkCyResults(res?.result?.res, { totalFailed: 1, totalTests: 2 });
    });

    it('01 check test with screenshot', async () => {
      const test = fixed.find(t => t.name?.includes('01'));
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );

      expect(obj).toEqual([
        {
          attachments: [
            {
              name: '01 test -- before all hook (failed).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '01 test',
          parents: [
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_0_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'failed',
                  steps: [
                    {
                      attachments: [],
                      name: 'wrap',
                      steps: [],
                    },
                  ],
                },
              ],
              suiteName: 'screenshot when global before hook fails',
            },
          ],
          status: 'failed',
          steps: [],
        },
      ]);
    });

    it('02 check test with screenshot', async () => {
      const test = fixed.find(t => t.name?.includes('02'));
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );

      expect(obj).toEqual([
        {
          attachments: [
            {
              name: '01 test -- before all hook (failed).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '02 test',
          parents: [
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_0_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'failed',
                  steps: [
                    {
                      attachments: [],
                      name: 'wrap',
                      steps: [],
                    },
                  ],
                },
              ],
              suiteName: 'screenshot when global before hook fails',
            },
          ],
          status: 'unknown',
          steps: [],
        },
      ]);
    });
  });
});
