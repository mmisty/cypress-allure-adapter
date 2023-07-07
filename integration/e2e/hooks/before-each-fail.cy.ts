describe('before each fail', () => {
  beforeEach(() => {
    cy.log('no name hook - before each');
  });

  beforeEach('Named hook', () => {
    cy.log('before each');
    cy.wrap(null).then(() => {
      throw new Error('BEFORE EACH FAIL');
    });
  });

  it('test 1', () => {
    cy.log('test 1');
  });

  it('test 2', () => {
    cy.log('test 2');
  });

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
