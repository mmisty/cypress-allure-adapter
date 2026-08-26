import { checkCyResults, createResTest2 } from '@test-utils';

describe('test debug log event', () => {
  const res = createResTest2(
    [
      `
describe('test duration', () => {
  it('hello test', () => {
    cy.log('3000');
  });
});
`,
    ],
    { DEBUG: 'cypress-allure*' },
  );

  describe('check results', () => {
    it('check cypress results', () => {
      checkCyResults(res?.result?.res, { totalPassed: 1 });
    });
  });
});
