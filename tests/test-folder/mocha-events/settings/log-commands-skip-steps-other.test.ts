import { createResTest2, mapSteps } from '@test-utils';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';

describe('should skip steps inside hooks / test', () => {
  const res = createResTest2(
    [
      `
  describe('suite', { defaultCommandTimeout: 500 },() => {
   before(()=> {
      cy.allure().startStep('my-step');
        cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
        cy.allure().endStep();
      cy.allure().endStep();
      
      cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
      cy.allure().endStep();
    });
    
    after(()=> {
      cy.allure().startStep('my-step');
        cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
        cy.allure().endStep();
      cy.allure().endStep();
      
      cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
      cy.allure().endStep();
    });
    
    
    beforeEach(()=> {
      cy.allure().startStep('my-step');
        cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
        cy.allure().endStep();
      cy.allure().endStep();
      
      cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
      cy.allure().endStep();
    });
    
    afterEach('Named', ()=> {
      cy.allure().startStep('my-step');
        cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
        cy.allure().endStep();
      cy.allure().endStep();
      
      cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
      cy.allure().endStep();
    });

  it('test1', () => {
    cy.allure().startStep('my-step');
        cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
        cy.allure().endStep();
      cy.allure().endStep();
      
      cy.allure().startStep('other-step');
          cy.allure().startStep('my-step');
          cy.allure().endStep();
      cy.allure().endStep();
  });
  
});

`,
    ],
    {
      allureSkipSteps:
        'my-step,*generateReport,*mergeUnitTestCoverage,*collectBackendCoverage,*@cypress/code-coverage*',
    },
  );
  describe('check results', () => {
    let resAllure: AllureTest[];

    beforeAll(() => {
      resAllure = parseAllure(res.watch);
    });

    it('should check before each/after each hooks (keep only named hooks)', () => {
      const tests = resAllure.filter(t => t.name === 'test1');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        status: t.status,
        name: t.name?.replace(/\d{4,}/g, 'number'),
      }));

      expect(steps).toEqual([
        {
          name: '"before each" hook',
          status: 'passed',
          steps: [],
        },
        {
          name: '"before each" hook',
          status: 'passed',
          steps: [
            {
              name: 'other-step',
              status: 'passed',
              steps: [],
            },
          ],
        },
        {
          name: 'other-step',
          status: 'passed',
          steps: [],
        },
        {
          name: '"after each" hook: Named',
          status: 'passed',
          steps: [
            {
              name: 'other-step',
              status: 'passed',
              steps: [],
            },
          ],
        },
        {
          name: '"after each" hook', //coverage
          status: 'passed',
          steps: [],
        },
      ]);
    });

    it('should check before all/after all hooks', () => {
      const tests = resAllure.filter(t => t.name === 'test1');
      expect(tests.length).toEqual(1);

      const befores = getParentsArray(tests[0]).flatMap(t =>
        t.befores?.map(x => ({
          name: (x as any).name,
          steps: mapSteps(x.steps, y => ({
            status: y.status,
            name: y.name?.replace(/\d{4,}/g, 'number'),
          })),
        })),
      );

      const afters = getParentsArray(tests[0]).flatMap(t =>
        t.afters?.map(x => ({
          name: (x as any).name,
          steps: mapSteps(x.steps, y => ({
            status: y.status,
            name: y.name?.replace(/\d{4,}/g, 'number'),
          })),
        })),
      );

      expect({ befores, afters }).toEqual({
        afters: [
          {
            name: '"after all" hook',
            steps: [
              {
                name: 'other-step',
                status: 'passed',
                steps: [],
              },
            ],
          },
          {
            name: 'video',
            steps: [],
          },
        ],
        befores: [
          {
            name: '"before all" hook', //coverage
            steps: [],
          },
          {
            name: '"before all" hook',
            steps: [
              {
                name: 'other-step',
                status: 'passed',
                steps: [],
              },
            ],
          },
        ],
      });
    });
  });
});
