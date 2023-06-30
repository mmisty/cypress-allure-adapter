import { visitHtml } from '../common/helper';

describe('suite with one test', () => {
  it('#2 test pass @P1', function () {
    visitHtml();
    cy.get('div').should('exist');
    cy.myLog('log task');
  });
});
