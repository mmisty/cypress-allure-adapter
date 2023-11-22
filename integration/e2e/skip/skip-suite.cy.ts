describe.skip('skipped', () => {
  beforeEach(() => {
    cy.log('before each for skipped');
  });

  it('test', function () {
    cy.log('skipped');
  });

  afterEach(() => {
    cy.log('after each for skipped');
  });
});
