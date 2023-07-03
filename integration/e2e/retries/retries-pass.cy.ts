import { visitHtml } from '../../common/helper';

describe('retries: pass on second retry', { retries: 2 }, () => {
  it('should pass on retries', () => {
    visitHtml();

    if (Cypress.currentRetry < 1) {
      cy.get('div')
        .then(t => t)
        .should('not.exist');
    }
  });
});
