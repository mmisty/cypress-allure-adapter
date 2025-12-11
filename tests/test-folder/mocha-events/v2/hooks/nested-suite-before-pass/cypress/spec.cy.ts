const rootSuite = 'nested-suite-before-pass';

describe(`${rootSuite}`, () => {
  describe('child suite', () => {
    before('in sub suite', () => {
      cy.log('hook pass');
    });

    it('test 1', () => {
      cy.log('test 1');
    });

    it('test 2', () => {
      cy.log('test 2');
    });
  });
});
