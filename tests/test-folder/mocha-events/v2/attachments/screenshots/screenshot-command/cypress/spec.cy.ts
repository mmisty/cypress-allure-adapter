import '@src/cypress/types';

describe('test screenshot', () => {
  it('screenshot test 01', () => {
    cy.task('log', 'message');
    cy.screenshot('my-test');
  });

  it('screenshot test no name 02', () => {
    cy.task('log', 'message');
    cy.screenshot();
  });
});
