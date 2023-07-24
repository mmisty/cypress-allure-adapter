describe('before each retry fails one @beforeEachRetry', { retries: 0 }, () => {
  beforeEach('Named hook', () => {
    cy.log('before each');
    cy.wrap(null).then(() => {
      throw new Error('BEFORE EACH FAIL');
    });
  });

  it('test that fails because of before each', () => {
    cy.log('not reachable');
  });

  /* it('test that has unknown status because of before each', () => {
    cy.log('not reachable');
  });*/
});
