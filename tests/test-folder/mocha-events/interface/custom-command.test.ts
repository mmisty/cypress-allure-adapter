import { createResTest2, fixResult, mapSteps } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('custom commands', () => {
  const res = createResTest2(
    [
      `
  describe('should pass', () => {
    it('custom command nesting test', () => {
      cy.myLog('hello');
      cy.get('div').should('exist');
    });
  });
`,
    ],
    { allureWrapCustomCommandsExperimental: 'true' },
  );

  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('should have label', () => {
      const tests = resFixed.filter(t => t.name === 'custom command nesting test');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({ name: t.name }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'myLog: hello',
          steps: [
            {
              name: 'myLog: hello',
              steps: [],
            },
            {
              name: 'task: log, hello',
              steps: [],
            },
          ],
        },
        {
          name: 'get: div',
          steps: [
            {
              name: 'assert: expected **<div.inner-container>** to exist in the DOM',
              steps: [],
            },
          ],
        },
      ]);
    });
  });
});
