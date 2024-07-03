describe('session', () => {
  it('should have correct steps for session', () => {
    cy.session('user', () => {
      cy.log('1');
      cy.setCookie('A', 'AAA');
      cy.wait(100);
    });
    cy.log('next step');
  });
});
