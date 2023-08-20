import { createResTest2, mapSteps } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should have steps by using cy.allure() interface', () => {
  const res = createResTest2(
    [
      `
  describe('set step from test', () => {
    it('01 step', () => {
      cy.allure().step('simple step with 0 duration');
    });
    
    it('02 step with duration', () => {
      cy.allure().startStep('my step');
      cy.wait(100);
      cy.allure().endStep();
    });
    
    it('03 mergeStep with duration', () => {
      cy.allure().startStep('my step');
      cy.wait(100);
      cy.allure().endStep();
      cy.allure().mergeStepMaybe('my step');
    });
    
    it('04 not mergeStep when diff name', () => {
      cy.allure().startStep('my step');
      cy.wait(100);
      cy.allure().endStep();
      cy.allure().mergeStepMaybe('my OTHER step');
    });
    
  });
`,
    ],
    {},
  );
  describe('check results', () => {
    let resAllure: AllureTest[];

    beforeAll(() => {
      resAllure = parseAllure(res.watch);
    });

    it('should have simple step with 0 duration', () => {
      const tests = resAllure.filter(t => t.name === '01 step');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        duration: (t.stop ?? 0) - (t.start ?? 0),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);
      expect(steps).toEqual([
        {
          duration: 0,
          name: 'simple step with 0 duration',
          steps: [],
        },
      ]);
    });

    it('should have step with start and end', () => {
      const tests = resAllure.filter(t => t.name === '02 step with duration');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        duration: (t.stop ?? 0) - (t.start ?? 0),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);
      expect(steps.length).toEqual(1);
      expect(steps[0].name).toEqual('my step');
      expect(steps[0].duration).toBeGreaterThan(100);
      expect(steps[0].steps.map(t => t.name)).toEqual(['wait: 100']);
      expect(steps[0].steps.map(t => t.steps)).toEqual([[]]);
    });

    it('should have merged steps with start and end', () => {
      const tests = resAllure.filter(
        t => t.name === '03 mergeStep with duration',
      );
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        duration: (t.stop ?? 0) - (t.start ?? 0),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);
      expect(steps.length).toEqual(1);

      expect(steps[0].name).toEqual('my step');
      expect(steps[0].duration).toBeGreaterThan(100);
      expect(steps[0].steps.map(t => t.name)).toEqual(['wait: 100']);
      expect(steps[0].steps.map(t => t.steps)).toEqual([[]]);
    });

    it('should have not merged steps with diff names', () => {
      const tests = resAllure.filter(
        t => t.name === '04 not mergeStep when diff name',
      );
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        duration: (t.stop ?? 0) - (t.start ?? 0),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);
      expect(steps.length).toEqual(2);

      expect(steps[0].name).toEqual('my step');
      expect(steps[0].duration).toBeGreaterThan(100);

      expect(steps[0].steps.map(t => t.name)).toEqual(['wait: 100']);
      expect(steps[0].steps.map(t => t.steps)).toEqual([[]]);

      // second
      expect(steps[1].name).toEqual('my OTHER step');
      expect(steps[1].duration).toBeLessThan(100);
      expect(steps[1].steps).toEqual([]);
    });
  });
});
