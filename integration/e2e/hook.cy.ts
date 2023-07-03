describe('hooks test', () => {
  before(() => {
    cy.log('before');
  });

  beforeEach(() => {
    cy.log('before each');
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

  after(() => {
    cy.log('after');
  });
});
