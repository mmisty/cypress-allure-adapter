import { createResTest2 } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should be able to change test status and details', () => {
  const res = createResTest2(
    [
      `
  describe('set step from test', () => {
    it('01 status skipped', () => {
      cy.allure().testStatus('skipped', { message: 'skipped from test'});
    });
    
    it('01 status details', () => {
      cy.allure().testDetails({ message: 'details from test'});
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

    it('should have status and status details', () => {
      const tests = resAllure.filter(t => t.name === '01 status skipped');
      expect(tests.length).toEqual(1);
      expect(tests[0].status).toEqual('skipped');
      expect(tests[0].statusDetails).toEqual({ message: 'skipped from test' });
      expect(tests[0].stage).toEqual('pending');
    });

    it('should have status details', () => {
      const tests = resAllure.filter(t => t.name === '01 status details');
      expect(tests.length).toEqual(1);
      expect(tests[0].status).toEqual('passed');
      expect(tests[0].statusDetails).toEqual({ message: 'details from test' });
      expect(tests[0].stage).toEqual('finished');
    });
  });
});
