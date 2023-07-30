import { createResTest2 } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { existsSync } from 'fs';

describe('should be able to delete results', () => {
  const res = createResTest2(
    [
      `
  describe('deleteResults', () => {
    it('01 deleteResults', () => {
      cy.allure().writeEnvironmentInfo({endVar: '123', ALLURE: 5});
      cy.allure().deleteResults();
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

    it('should be able to delete results from test', () => {
      const tests = resAllure.filter(t => t.name === '01 deleteResults');
      expect(existsSync(`${res.watch}/environment.properties`)).toEqual(false);
      expect(tests.length).toEqual(0);
    });
  });
});
