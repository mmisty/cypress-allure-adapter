describe('suite', () => {
  it('set testStatus', () => {
    cy.wrap(null).then(() => {
      throw new Error('sdsd');
    });
    // cy.allure().testStatus('failed', { message: 'ssds' });
  });
  afterEach(function () {
    if (this.currentTest?.err) {
      cy.allure().testStatus('passed', { message: 'ssds' });
    }
  });
});
