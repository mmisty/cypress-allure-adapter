import { visitHtml } from '../../common/helper';

describe('retries: pass on second retry', { retries: 2 }, () => {
  it('should pass on retries', () => {
    visitHtml();

    cy.get('div')
      .then(t => t)
      .should(Cypress.currentRetry < 1 ? 'not.exist' : 'exist');
  });
});
