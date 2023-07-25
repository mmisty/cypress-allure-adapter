describe('should pass', () => {
  it('custom command nesting test', () => {
    cy.myLog('hello');
  });

  it('custom command nesting test 2', () => {
    cy.otherCmd('hello');
  });
});
