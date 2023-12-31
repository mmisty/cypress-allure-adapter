describe('skipped inside', () => {
  beforeEach(() => {
    cy.log('before each for skipped');
  });

  it('test', function () {
    cy.log('skipped inside');
    cy.allure().tag('MY');
    this.skip();
    cy.log('this should be skipped step');
  });

  afterEach(() => {
    cy.allure().testDetails({ message: 'Test IGNORED' });
    cy.log('after each for skipped');
  });
});
