import { redirectTestLogs } from 'cypress-redirect-browser-log';
import { registerCypressGrep } from '@mmisty/cypress-grep';
import { allureAdapterSetup } from '../../src/setup';
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

beforeEach(() => {
  cy.log('log', 'Registered allureAdapterSetup');
});

redirectTestLogs({
  isLogCommandDetails: false,
});

registerCypressGrep({
  addControlToUI: true,
});

setupCoverage();
allureAdapterSetup();

/**
 * Log node
 */
Cypress.Commands.add('myLog', (message: string) => {
  Cypress.log({ name: 'myLog', message });
  cy.task('log', message);
});
