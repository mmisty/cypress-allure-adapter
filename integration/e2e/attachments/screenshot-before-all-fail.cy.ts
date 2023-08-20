import { beforeStr, suiteStr, testStr, visitHtmlStr } from '../../../tests/cy-helper/test-compose';
import { visitHtml } from '../../common/helper';

describe('screenshot when before hook fails @screen', () => {
  before(() => {
    visitHtml();
    cy.get('div:eq(200)').should('exist');
  });

  it('test', () => {
    cy.log('hello');
  });
});
