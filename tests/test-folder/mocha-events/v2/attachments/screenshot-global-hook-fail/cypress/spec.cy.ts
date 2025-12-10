before(() => {
  cy.wrap(null).then(() => {
    throw new Error('On Purpose');
  });
});

describe('screenshot when global before hook fails', () => {
  it('01 test', () => {
    cy.log('hello');
  });
});

