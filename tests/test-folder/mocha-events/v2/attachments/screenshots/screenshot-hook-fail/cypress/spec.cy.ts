import '@src/cypress/types';

describe('screenshot when before hook fails', () => {
  before(() => {
    cy.wrap(null).then(() => {
      throw new Error('On Purpose');
    });
  });

  it('01 test', () => {
    cy.log('hello');
  });
});
