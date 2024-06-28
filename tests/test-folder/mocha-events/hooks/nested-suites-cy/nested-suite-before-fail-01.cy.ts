/**
 * When hook in child suite fails
 *  - result should have proper suite structure
 *  - attachments
 *  - steps
 *  - video in tear down
 */
describe('Suite01 failure in nested suite before hook', () => {
  it('test 0', () => {
    cy.log('test 1');
  });

  describe('hooks test - child', () => {
    describe('hooks test - sub child', () => {
      before(' in suite', () => {
        throw new Error('Failure in hook');
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
