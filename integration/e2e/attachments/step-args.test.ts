import { visitHtml } from '../../common/helper';

describe('step-args', () => {
  it('should attach args as file', () => {
    visitHtml();
    cy.get('div').contains('1');
  });

  it('should attach args as file', () => {
    visitHtml();
    cy.request('/apr', { hello: 'asdasd', data: 2, data2: 'some datatatatata' });
    cy.get('div').should('exist');
  });
});
