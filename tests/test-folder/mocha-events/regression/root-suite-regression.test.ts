import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';

// https://github.com/mmisty/cypress-allure-adapter/issues/112
describe('should be no Root suite when watch path is the same as results path (regression)', () => {
  const res = createResTest2(
    [
      `
describe('One test', () => {
  it('other1', () => {
    cy.log("1");
  });
  
  it('other2', () => {
    cy.log("2");
  });
  
  it('other3', () => {
    cy.log("3");
  });
  
  it('other4', () => {
    cy.log("4");
  });
  
  it('other5', () => {
    cy.log("5");
  });
})
`,
    ],
    {
      allureResultsWatchPath: '<storeResDir>',
    },
  );

  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(5);
    });

    it('check tests suites', async () => {
      expect(
        resFixed.map(t =>
          getParentsArray(t).map(t => ({ name: t.name, parent: t.parent })),
        ),
      ).toEqual([
        [{ name: 'One test' }],
        [{ name: 'One test' }],
        [{ name: 'One test' }],
        [{ name: 'One test' }],
        [{ name: 'One test' }],
      ]);
    });
  });
});
