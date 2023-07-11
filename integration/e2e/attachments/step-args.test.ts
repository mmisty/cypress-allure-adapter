import { visitHtml } from '../../common/helper';

describe('step-args', () => {
  it('should attach args as file1', () => {
    visitHtml();
    cy.get('div').contains('1');
  });

  it('should attach args as file2', () => {
    visitHtml();
    cy.request('/apr', { hello: 'asdasd', data: 2, data2: 'some datatatatata' });
    cy.get('div').should('exist');
  });

  it('should attach args as file3', () => {
    visitHtml();
    cy.request({ method: 'GET', url: '/apr', body: { hello: 'asdasd', data: 2, data2: 'some datatatatata' } });
    cy.get('div').should('exist');
  });

  it('should attach args as file4', () => {
    visitHtml();
    cy.request('/apr');
    cy.get('div').should('exist');
  });

  it('should attach args as file5', () => {
    visitHtml();
    cy.request('POST', '/apr');
    cy.get('div').should('exist');
  });
});
