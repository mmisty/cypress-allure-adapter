import { checkCyResults, createResTest2 } from '../../../cy-helper/utils';
import { existsSync } from 'fs';

describe('should be no results when allure:false', () => {
  const res = createResTest2(
    [
      `
  describe('should pass', () => {
    it('label test', () => {
      Cypress.Allure.label('THREAD', '01');
      cy.allure().tag('123');
    });
  });
`,
    ],
    { allure: 'false' },
  );

  describe('check results', () => {
    it('should have no results', () => {
      // should not fail run
      checkCyResults(res?.result?.res, {
        totalPassed: 1,
        totalFailed: 0,
        totalPending: 0,
        totalSkipped: 0,
        totalSuites: 1,
        totalTests: 1,
      });
    });

    expect(existsSync(res.watch)).toEqual(false);
  });
});
