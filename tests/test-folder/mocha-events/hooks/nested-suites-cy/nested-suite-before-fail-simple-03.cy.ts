/**
 * When hook in child suite fails
 *  - result should have proper suite structure
 *  - attachments
 *  - steps
 *  - video in tear down
 */
describe('Suite03 failure in nested suite before hook', () => {
  describe('hooks test - child', () => {
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
