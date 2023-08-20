describe('suite @strange', () => {
  it('example visit', () => {
    cy.visit('https://example.cypress.io/');
    cy.get('div').should('contain.text', 'Kitchen Sink');
    cy.get('div').should('have.length.gt', 1);
    cy.get('div').click();
  });
});
