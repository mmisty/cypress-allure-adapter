/**
 * When hook in child suite passed
 *  - result should have proper suite structure
 *  - attachments
 *  - steps
 */
describe('Suite02 before hook passes in nested suite', () => {
  it('test 0', () => {
    cy.log('test 1');
  });

  describe('hooks test - child', () => {
    describe('hooks test - sub child', () => {
      before('in suite', () => {
        cy.log('before');
      });

      it('test 1', () => {
        cy.log('test 1');
      });

      it('test 2', () => {
        cy.log('test 2');
      });
    });
  });
});
