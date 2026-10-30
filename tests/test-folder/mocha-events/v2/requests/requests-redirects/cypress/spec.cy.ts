import '@src/cypress/types';

describe('suite', () => {
  beforeEach(() => {
    cy.intercept('mytest.com**', {
      body: `<html>
          <head></head>
        <body>
        <a href="#2" data-qa-id="link-2">My link</a>
        <a href="#3" data-qa-id="link-3">My link</a>
        </body>
        </html>
        `,
    });

    cy.visit('mytest.com');
  });

  it('01 redirects test', () => {
    // Cypress 16 no longer proxies unknown relative paths through a 302 -> __/ chain.
    // Keep failOnStatusCode false so we still assert request reporting for non-2xx.
    cy.request({ url: '/api/test', failOnStatusCode: false });
  });

  it('02 its status', () => {
    cy.wrap({ status: 200 }).its('status').should('eq', 200);
  });
});
