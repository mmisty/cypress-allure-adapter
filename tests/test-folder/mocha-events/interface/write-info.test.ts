import { createResTest2, readWithRetry } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { existsSync } from 'fs';

describe('should be able to write env info and other', () => {
  const res = createResTest2(
    [
      `
  describe('write info from test', () => {
    it('01 writeEnvironmentInfo', () => {
      cy.allure().writeEnvironmentInfo({endVar: '123', ALLURE: 5});
    });
    
    it('03 writeExecutorInfo', () => {
      cy.allure().writeExecutorInfo({
        name: 'Jenkins',
        type: 'CI',
        url: 'http://je.com',
        buildOrder: 1,
        buildName: '1',
        buildUrl: 'http://je.com/1',
        reportUrl: 'http://je.com/1/allure',
        reportName: 'allure 1',
      });
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
      expect(
        readWithRetry(`${res.watch}/environment.properties`).toString(),
      ).toEqual('endVar = 123\nALLURE = 5');
    });

    it('should be able to write executor info from test', () => {
      const tests = resAllure.filter(t => t.name === '03 writeExecutorInfo');
      expect(tests.length).toEqual(1);
      expect(tests[0].status).toEqual('passed');
      const file = `${res.watch}/executor.json`;
      expect(existsSync(file)).toEqual(true);

      const contents = readWithRetry(file).toString();
      expect(JSON.parse(contents)).toEqual({
        name: 'Jenkins',
        type: 'CI',
        url: 'http://je.com',
        buildOrder: 1,
        buildName: '1',
        buildUrl: 'http://je.com/1',
        reportUrl: 'http://je.com/1/allure',
        reportName: 'allure 1',
      });
    });
  });
});
