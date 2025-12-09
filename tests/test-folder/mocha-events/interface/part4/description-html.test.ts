import { createResTest2, fixResult } from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should have descriptionhtml by using cy.allure() interface', () => {
  const res = createResTest2(
    [
      `
  describe('set addDescriptionHtml from test', () => {
   
    it('01 addDescriptionHtml', () => {
      cy.allure().addDescriptionHtml('<b>bold text</b>')
      cy.allure().addDescriptionHtml('<b>addition1</b>')
    });
    
    it('02 addDescriptionHtml', () => {
      cy.allure().addDescriptionHtml('<b>new desc</b>')
      cy.allure().addDescriptionHtml('<b>addition2</b>')
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

    it('should have combined description', () => {
      const tests = resFixed.filter(t => t.name === '01 addDescriptionHtml');
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.descriptionHtml).sort();
      expect(parameters).toEqual(['<b>bold text</b><b>addition1</b>']);
    });

    it('should have combined description 2', () => {
      const tests = resFixed.filter(t => t.name === '02 addDescriptionHtml');
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.descriptionHtml).sort();
      expect(parameters).toEqual(['<b>new desc</b><b>addition2</b>']);
    });
  });
});
