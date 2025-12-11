const rootSuite = 'before-each-fail-nested-suite';

describe(`${rootSuite}`, () => {
  describe('child suite', () => {
    // @ts-ignore
    beforeEach('named before each', () => {
      cy.log('before each');
      cy.wrap(null).then(() => {
        throw new Error('fail in before each');
      });
    });

    it('test 1', () => {
      cy.log('test 1');
    });
  });
});
