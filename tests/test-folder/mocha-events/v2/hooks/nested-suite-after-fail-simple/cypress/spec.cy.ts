const rootSuite = 'nested-suite-after-fail-simple';

describe(`${rootSuite}`, () => {
  describe('child suite', () => {
    after('in sub suite', () => {
      cy.log('hook pass');
      cy.wrap(null).then(() => {
        throw new Error('Failure in hook');
      });
    });

    it('test 1', () => {
      cy.log('test 1');
    });

    it('test 2', () => {
      cy.log('test 2');
    });
  });
});
