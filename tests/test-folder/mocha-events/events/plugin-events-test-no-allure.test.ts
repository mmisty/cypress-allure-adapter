import { checkCyResults, createResTest2 } from '@test-utils';
import { existsSync } from 'fs';

describe('plugin events when no allure', () => {
  const res = createResTest2(
    [
      `
describe('hello suite', () => {
  Cypress.Allure.on('test:started', () => {
    Cypress.Allure.step('step right after start');
  });
  
  Cypress.Allure.on('test:ended', () => {
    Cypress.Allure.step('step right before test end');
  });
  
  it('hello test', () => {
    cy.wrap(null).then(() => {
        throw new Error('Test FAIL on purpose');
    });
  });
});
`,
    ],
    { allure: 'false' },
    false,
  );
  it('should be ok', () => {
    checkCyResults(res?.result?.res, {
      totalPassed: 0,
      totalFailed: 1,
      totalPending: 0,
      totalSkipped: 0,
      totalSuites: 1,
      totalTests: 1,
    });
  });

  it('should not have events registered', async () => {
    expect(existsSync(res.specs[0])).toEqual(false);
  });
});
