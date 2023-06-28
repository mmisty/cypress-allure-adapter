import { visitHtml } from '../common/helper';

describe('suite with one test', () => {
  it('test pass @P1', function () {
    visitHtml();
    cy.get('div').should('exist');
    cy.myLog('log task');
  });
});
