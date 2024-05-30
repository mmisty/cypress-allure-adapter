import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';

// https://github.com/mmisty/cypress-allure-adapter/issues/112
describe('should be no Root suite (regression) - issue #112', () => {
  const res = createResTest2(
    [
      `
describe('One test', () => {
  it('other1', () => {
    cy.wait(10);
  });
  
  it('other2', () => {
    cy.wait(10);
  });
  
  it('other3', () => {
    cy.wait(10);
  });
  
  it('other4', () => {
    cy.wait(10);
  });
  
  it('other5', () => {
    cy.wait(10);
  });
})
`,
    ],
    { allureAddVideoOnPass: 'false', allureSkipCommands: '' },
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
