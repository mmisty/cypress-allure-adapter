import { visitHtml } from '../common/helper';

describe('suite with one test 2', () => {
  it('#2', () => {
    cy.allure().tag('@my');
    cy.wrap(null, { log: false }).then(() => {
      throw new Error('EXPECTED FAIL');
    });
  });

  it('test simple', () => {
    expect(0).eq(0);

    visitHtml();
    cy.get('body').then(() => {
      cy.allure().startStep('my step');
      cy.screenshot('afterScreen');
      cy.allure().endStep();
    });
  });
});
