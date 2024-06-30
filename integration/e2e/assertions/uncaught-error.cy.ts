import { visitHtml } from '../../common/helper';

describe('uncaught error', () => {
  it('#1 test pass', function () {
    cy.on('uncaught:exception', (err, runnable) => {
      // returning false here prevents Cypress from
      // failing the test
      return false;
    });
    visitHtml({
      script: `
    throw new Error('UNCAUGHT 1');
    `,
    });
    // setTimeout(() => {
    //   throw new Error('UNCAUGHT ERR ');
    // }, 100);

    cy.get('div').should('exist');
  });

  it('#1 test pass with parent', function () {
    cy.on('uncaught:exception', (err, runnable) => {
      // returning false here prevents Cypress from
      // failing the test
      return false;
    });

    cy.allure().startStep('VISITING');
    visitHtml({
      script: `
    throw new Error('UNCAUGHT 1');
    `,
    });

    cy.allure().endStep();
    cy.get('div').should('exist');
  });

  it('#2 test fail', function () {
    cy.on('uncaught:exception', (err, runnable) => {
      // returning false here prevents Cypress from
      // failing the test
      return false;
    });
    cy.allure().startStep('VISITING');
    visitHtml({
      script: `
    throw new Error('UNCAUGHT 1');
    `,
    });
    cy.get('div').should('not.exist');
    cy.allure().endStep();
  });

  it('#3 test fail', function () {
    cy.allure().startStep('VISITING');
    visitHtml({
      script: `
    throw new Error('UNCAUGHT 1');
    `,
    });
    cy.get('div').should('not.exist');
    cy.allure().endStep();
  });

  it('#5 test fail', function () {
    cy.allure().startStep('VISITING');

    cy.allure().endStep();
    cy.allure().startStep('VISITING2');
    cy.allure().startStep('CHILD');
    cy.allure().endStep('failed');

    cy.allure().endStep();
  });
});
