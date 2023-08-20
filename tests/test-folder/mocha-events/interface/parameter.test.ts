import { createResTest2, fixResult, mapSteps } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should have parameters by using cy.allure() interface', () => {
  const res = createResTest2(
    [
      `
  describe('set parameter from test', () => {
    it('01 parameter for step', () => {
      cy.allure().startStep('init');
      cy.allure().parameter('Letter1', 'A');
      cy.allure().endStep();
    });
    
    it('01 parameter no step', () => {
      cy.allure().parameter('Letter1', 'A');
    });
    
    it('02 two parameters', () => {
      cy.allure().parameter('Letter1', 'A').parameter('Letter2', 'B');
    });
    
    it('03 parameterSS interface', () => {
      cy.allure().parameters({ name: 'Letter1', value: 'A' }, { name: 'Letter2', value: 'B' });
    });
    
    it('04 parameter for test when step started', () => {
      cy.allure().startStep('init');
      cy.allure().testParameter('Letter1', 'A');
      cy.allure().endStep();
    });
    
  });
`,
    ],
    {},
  );
  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('should have step parameters', () => {
      const tests = resFixed.filter(t => t.name === '01 parameter for step');
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.parameters).sort();
      expect(parameters).toEqual([[]]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        params: t.parameters,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'init',
          params: [{ name: 'Letter1', value: 'A' }],
          steps: [],
        },
      ]);
    });

    it('should have test parameters when no step', () => {
      const tests = resFixed.filter(t => t.name === '01 parameter no step');
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.parameters).sort();
      expect(parameters).toEqual([[{ name: 'Letter1', value: 'A' }]]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        params: t.parameters,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([]);
    });

    it('should have test parameters when using testParameter interface', () => {
      const tests = resFixed.filter(
        t => t.name === '04 parameter for test when step started',
      );
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.parameters).sort();
      expect(parameters).toEqual([[{ name: 'Letter1', value: 'A' }]]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        params: t.parameters,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'init',
          params: [],
          steps: [],
        },
      ]);
    });

    it('should have test parameters when no step - two params', () => {
      const tests = resFixed.filter(t => t.name === '02 two parameters');
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.parameters).sort();
      expect(parameters).toEqual([
        [
          { name: 'Letter1', value: 'A' },
          { name: 'Letter2', value: 'B' },
        ],
      ]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        params: t.parameters,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([]);
    });

    it('should have test parameters when no step - two params with parametersInreface', () => {
      const tests = resFixed.filter(t => t.name === '03 parameterSS interface');
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.parameters).sort();
      expect(parameters).toEqual([
        [
          { name: 'Letter1', value: 'A' },
          { name: 'Letter2', value: 'B' },
        ],
      ]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        params: t.parameters,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([]);
    });
  });
});
