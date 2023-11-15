import { visitHtml } from '../../common/helper';

Cypress.env('allureSkipCommands', 'screenshot');
describe('screenshot', () => {
  describe('screenshot @screen', () => {
    beforeEach(() => {
      visitHtml();
    });

    it('test 1', () => {
      cy.allure().startStep('step 1');
      cy.get('div').first().screenshot({ allureAttachToStep: true });
      cy.allure().endStep();
    });

    it('test 2', () => {
      cy.allure().startStep('step 1');
      cy.get('div').first().screenshot({ allureAttachToStep: true });
      cy.get('div').eq(1).screenshot();
      cy.allure().endStep();
    });

    it('test 3', () => {
      cy.allure().startStep('step 1');
      cy.get('div').first().screenshot();
      cy.allure().endStep();
    });
  });
});
