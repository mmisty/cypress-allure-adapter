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

if (Cypress.env('allure') === 'true' || Cypress.env('allure') === true) {
  beforeEach('Register allure test', () => {
    cy.log('log', 'Registered allureAdapterSetup');
  });
}

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

if (Cypress.config('isInteractive')) {
  console.log('DELETE');
  Cypress.Allure.deleteResults();
}
