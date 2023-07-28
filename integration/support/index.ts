import { redirectTestLogs } from 'cypress-redirect-browser-log';
import { registerCypressGrep } from '@mmisty/cypress-grep';
import { allureAdapterSetup } from '@src';
import { COVERAGE } from '../common/constants';

console.log('====SUPPORT INDEX STARTED');

const setupCoverage = () => {
  if (Cypress.env(COVERAGE) === 'true' || Cypress.env(COVERAGE) === true) {
    console.log('ENABLE COV');
    require('@cypress/code-coverage/support');
  } else {
    console.log('COVERAGE NOT ENABLED IN BROWSER');
  }
};

allureAdapterSetup();

redirectTestLogs({
  isLogCommandDetails: false,
});

registerCypressGrep({
  addControlToUI: true,
});

setupCoverage();

/**
 * Log node
 */
Cypress.Commands.add('myLog', (message: string) => {
  Cypress.log({ name: 'myLog', message });
  cy.task('log', message);
});

Cypress.Commands.add('otherCmd', (message: string) => {
  cy.task('log', message);
  cy.get('div:eq(100)').should('not.exist');
});

Cypress.Commands.add('fileExists', (filePath: string) => {
  cy.wait(1000);
  cy.wait(200);

  return cy.task<boolean>('fileExists', filePath);
});

if (Cypress.config('isInteractive')) {
  console.log('DELETE');
  Cypress.Allure.deleteResults();
}
