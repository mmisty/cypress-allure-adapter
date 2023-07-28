import { createResTest2 } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should have full name by using cy.allure() interface', () => {
  const res = createResTest2(
    [
      `
  describe('set full name from test', () => {
    it('01 fullName', () => {
      cy.allure().fullName('123 test');
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
      const tests = resAllure.filter(t => t.name === '01 fullName');
      expect(tests.length).toEqual(1);

      expect(tests[0].fullName).toEqual('123 test');
      expect(tests[0].name).toEqual('01 fullName');
    });
  });
});
