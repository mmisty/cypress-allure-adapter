import { createResTest2, fixResult, mapSteps } from '../../../cy-helper/utils';
import { parseAllure } from 'allure-js-parser';

describe('test with steps - failure inside steps', () => {
  const res = createResTest2(
    [
      `
describe('Summ - substract', { defaultCommandTimeout: 1000 }, () => {
     
     afterEach('Test teardown', () => {
        cy.log('Some teardown step');
      });
      
      it('should summ values', () => {
        cy.allure().startStep('summ');
        cy.allure().parameter('A', '1').parameter('B', '2');
        cy.wrap(1 + 2).should('eq', 1);
        cy.allure().endStep();
      });
      
       it('should summ values with retry', { retries: 1 }, () => {
        cy.allure().startStep('summ');
        cy.allure().parameter('A', '1').parameter('B', '2');
        cy.wrap(1 + 2).should('eq', 1);
        cy.allure().endStep();
      });
});
`,
    ],
    { allureAddVideoOnPass: 'false', allureSkipCommands: '' },
  );

  describe('check results', () => {
    let resFixed;

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(3);
    });

    it('should have step', () => {
      const tests = resFixed.filter(t => t.name === 'should summ values');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        status: t.status,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);
      expect(steps).toEqual([
        {
          name: 'summ',
          status: 'failed',
          steps: [
            {
              name: 'wrap: 3',
              status: 'failed',
              steps: [
                {
                  name: 'assert: expected **3** to equal **1**',
                  status: 'failed',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('should have step with retry', () => {
      const tests = resFixed.filter(t => t.name === 'should summ values with retry');
      expect(tests.length).toEqual(2);

      const steps1 = mapSteps(tests[0].steps, t => ({
        name: t.name,
        status: t.status,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      const steps2 = mapSteps(tests[0].steps, t => ({
        name: t.name,
        status: t.status,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect({ steps1, steps2 }).toEqual({
        steps1: [
          {
            name: 'summ',
            status: 'failed',
            steps: [
              {
                name: 'wrap: 3',
                status: 'failed',
                steps: [
                  {
                    name: 'assert: expected **3** to equal **1**',
                    status: 'failed',
                    steps: [],
                  },
                ],
              },
            ],
          },
        ],
        steps2: [
          {
            name: 'summ',
            status: 'failed',
            steps: [
              {
                name: 'wrap: 3',
                status: 'failed',
                steps: [
                  {
                    name: 'assert: expected **3** to equal **1**',
                    status: 'failed',
                    steps: [],
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  });
});
