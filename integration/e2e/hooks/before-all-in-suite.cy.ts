describe('hello suite', () => {
  before(() => {
    cy.wrap(null).then(() => {
      throw new Error('Test FAIL on purpose');
    });
  });

  beforeEach(() => {
    cy.log('before');
  });

  it('hello test', () => {
    cy.log('123');
  });

  afterEach(() => {
    cy.log('after');
  });
});
