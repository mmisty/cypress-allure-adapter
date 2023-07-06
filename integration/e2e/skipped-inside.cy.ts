describe('skipped inside', () => {
  beforeEach(() => {
    cy.log('before each for skipped');
  });

  it('test', function () {
    cy.log('skipped inside');
    this.skip();
  });

  afterEach(() => {
    cy.log('after each for skipped');
  });
});
