import { createResTest2 } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { existsSync, readFileSync } from 'fs';

describe('should be able to write env info and other', () => {
  const res = createResTest2(
    [
      `
  describe('write info from test', () => {
    it('01 writeEnvironmentInfo', () => {
      cy.allure().writeEnvironmentInfo({endVar: '123', ALLURE: 5});
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

    it('should be able to write env info from test', () => {
      const tests = resAllure.filter(t => t.name === '01 writeEnvironmentInfo');
      expect(tests.length).toEqual(1);
      expect(tests[0].status).toEqual('passed');
      expect(existsSync(`${res.watch}/environment.properties`)).toEqual(true);
      expect(readFileSync(`${res.watch}/environment.properties`).toString()).toEqual('endVar = 123\nALLURE = 5');
    });
  });
});
