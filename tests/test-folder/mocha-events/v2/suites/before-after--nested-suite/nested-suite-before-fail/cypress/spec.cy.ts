describe('nested-suite-before-fail', () => {
  it('test 000', () => {
    cy.log('test 1');
  });

  describe('hooks test - child', () => {
    describe('hooks test - sub child', () => {
      before('in sub suite', () => {
        throw new Error('Failure in hook');
      });

      it('test 010', () => {
        cy.log('test 1');
      });

      it('test 020', () => {
        cy.log('test 2');
      });
    });
  });
});
