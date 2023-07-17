describe('before each fail with retry', { retries: 2 }, () => {
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

  it('test 1', () => {
    cy.log('test 1');
  });

  for (let i = 2; i <= 30; i++) {
    it(`test ${`0${i}`.slice(-2)}`, () => {
      cy.log(`test ${i.toFixed(-2)}`);
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
