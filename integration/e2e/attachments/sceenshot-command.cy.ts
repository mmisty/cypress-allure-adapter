import { visitHtml } from '../../common/helper';

describe('screenshot', () => {
  it('make screenshot no name', () => {
    visitHtml();
    cy.screenshot();
  });
});
