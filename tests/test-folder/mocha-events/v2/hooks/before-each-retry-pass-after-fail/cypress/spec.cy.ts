const rootSuite = 'before-each-retry-pass-after-fail';
const tests = 3;

describe(`${rootSuite} @beforeEachRetry`, { retries: 2 }, () => {
  beforeEach(() => {
    cy.log('no name hook - before each');
  });

  beforeEach('Named hook', () => {
    cy.log('before each');

    if (Cypress.currentRetry < 1) {
      cy.wrap(null).then(() => {
        throw new Error('BEFORE EACH FAIL');
      });
    }
  });

  for (let i = 1; i <= tests; i++) {
    it(`test ${`0${i}`.slice(-2)}`, () => {
      cy.log(`test ${i}`);
    });
  }
});
