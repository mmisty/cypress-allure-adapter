const rootSuite = 'nested-suite-pass';

describe(`${rootSuite}`, () => {
  describe('child suite', () => {
    it('test 1', () => {
      cy.log('test 1');
    });
  });

  it('test 2', () => {
    cy.log('test 2');
  });
});
