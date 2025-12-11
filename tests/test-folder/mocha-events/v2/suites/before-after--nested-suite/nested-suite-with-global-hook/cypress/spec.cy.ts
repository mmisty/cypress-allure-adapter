import '@src/cypress/types';

before('global before one', () => {
  cy.log('hook pass');
});

after('global after one', () => {
  cy.log('hook pass');
});

describe('nested-suite-with-global-hook', () => {
  describe('child suite', () => {
    it('test 01', () => {
      cy.log('test 1');
    });
  });

  it('test 02', () => {
    cy.log('test 2');
  });
});
