import { createResTest2 } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should set historyId by using cy.allure() interface', () => {
  const res = createResTest2(
    [
      `
  describe('set historyId for test', () => {
    it('01 historyId', () => {
      cy.allure().historyId('1c6b6e73-6043-4772-a079-c722afcd1700');
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
      const tests = resAllure.filter(t => t.name === '01 historyId');
      expect(tests.length).toEqual(1);

      expect(tests[0].historyId).toEqual(
        '1c6b6e73-6043-4772-a079-c722afcd1700',
      );
      expect(tests[0].name).toEqual('01 historyId');
    });
  });
});
