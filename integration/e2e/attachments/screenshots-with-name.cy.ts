import { visitHtml } from '../../common/helper';

Cypress.env('allureSkipCommands', 'screenshot');
describe('screenshot', () => {
  describe('screenshot with name @screen', () => {
    beforeEach(() => {
      visitHtml();
    });

    it('test 1 - should have 1 step screenshot', () => {
      cy.allure().startStep('step 1');
      cy.screenshot('my-step', { allureAttachToStep: true });
      cy.allure().endStep();
    });

    it('test 1.1 - should have 1 step screenshot for element', () => {
      cy.allure().startStep('step 1');
      cy.get('div').first().screenshot('my-element', { allureAttachToStep: true });
      cy.allure().endStep();
    });

    it('test 2 - should have 1 step screenshot and one test screenshot', () => {
      cy.allure().startStep('step 1');
      cy.screenshot('my-step', { allureAttachToStep: true });
      cy.screenshot('my-test');
      cy.allure().endStep();
    });

    it('test 2.1 - should have 1 step screenshot and one test screenshot for element', () => {
      cy.allure().startStep('step 1');
      cy.get('div').first().screenshot('my-step', { allureAttachToStep: true });
      cy.get('div').eq(1).screenshot('my-test');
      cy.allure().endStep();
    });

    it('test 3 - should have 1 test screenshot', () => {
      cy.allure().startStep('step 1');
      cy.screenshot('my-test');
      cy.allure().endStep();
    });

    it('test 3.1 - should have 1 test screenshot for element', () => {
      cy.allure().startStep('step 1');
      cy.get('div').first().screenshot('my-test');
      cy.allure().endStep();
    });
  });
});
