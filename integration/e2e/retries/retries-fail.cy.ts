import { visitHtml } from '../../common/helper';

describe('retries: fail', { retries: 2 }, () => {
  it('should fail on retries', () => {
    visitHtml();
    cy.get('div')
      .then(t => t)
      .should('not.exist');
  });
});
