const rootSuite = 'nested-suite-with-global-hook';

before('global before one', () => {
  cy.log('hook pass');
});

after('global after one', () => {
  cy.log('hook pass');
});

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
