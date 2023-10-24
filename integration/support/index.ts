import { redirectTestLogs } from 'cypress-redirect-browser-log';
import { registerCypressGrep } from '@mmisty/cypress-grep';
import { COVERAGE } from '../common/constants';
//import '@src/support';
import { delay } from '@src/common';
import Chainable = Cypress.Chainable;
import { allureAdapterSetup } from '@src';

console.log('====SUPPORT INDEX STARTED');

const setupCoverage = () => {
  if (Cypress.env(COVERAGE) === 'true' || Cypress.env(COVERAGE) === true) {
    console.log('ENABLE COV');
    require('@cypress/code-coverage/support');
  } else {
    console.log('COVERAGE NOT ENABLED IN BROWSER');
  }
};

redirectTestLogs({
  isLogCommandDetails: false,
});

if (Cypress.env('USE_GREP') === 'true' || Cypress.env('USE_GREP') === true) {
  registerCypressGrep({
    addControlToUI: true,
  });
}

allureAdapterSetup();
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

Cypress.Commands.add('qaId', (qaId, options = {}) => {
  cy.get(`[data-qa-id="${qaId}"]`, options);
});

Cypress.Commands.add('fileExists', (filePath: string) => {
  cy.wait(1000);
  cy.wait(200);

  return cy.task<boolean>('fileExists', filePath);
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const fn: (subj: any, delay?: number) => Chainable<any> = async (subject: any, delayNum?: number) => {
  const log = Cypress.log({
    name: 'promise inside',
    message: `wait ${delayNum ?? 1}`,
    autoEnd: false,
  });
  await delay(delayNum ?? 1);
  log.end();

  return subject;
};

Cypress.Commands.add('promiseTest', { prevSubject: ['element'] }, fn);

if (Cypress.config('isInteractive')) {
  console.log('DELETE');
  Cypress.Allure.deleteResults();
}
