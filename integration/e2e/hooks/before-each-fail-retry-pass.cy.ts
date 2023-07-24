describe('before each fail with retry @beforeEachRetry', { retries: 2 }, () => {
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

  for (let i = 1; i <= 10; i++) {
    it(`test ${`0${i}`.slice(-2)}`, () => {
      cy.log(`test ${i}`);
    });
  }

  afterEach(() => {
    cy.log('log after each');
  });

  afterEach('Named after', () => {
    cy.log('log after each');
  });

  after(() => {
    cy.log('after');
  });

  after('named hook all after', () => {
    cy.log('after');
  });
});
