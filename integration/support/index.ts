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

/*
Cypress.Allure.on('test:started', test => {
  console.log(`AFTER TEST STARTED: ${test.title}`);
  Cypress.Allure.label('event', 'started');
  Cypress.Allure.label('tag', 'started');
  Cypress.Allure.step('after start');
  Cypress.Allure.addDescriptionHtml(Cypress.spec.relative);
});

Cypress.Allure.on('test:started', () => {
  Cypress.Allure.step('after start2');
});

Cypress.Allure.on('test:ended', test => {
  console.log(`BEFORE ENDING TEST: ${test.title}`);
  Cypress.Allure.label('event', 'ended');
  Cypress.Allure.label('tag', 'ended');
  Cypress.Allure.step('before end');
});*/

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

Cypress.Commands.add('returnGet', { prevSubject: true }, (subj, message: string) => {
  cy.task('log', message);

  return cy.wrap(subj).get('div:eq(100)');
});

Cypress.Commands.add('fileExists', (filePath: string) => {
  cy.wait(1000);
  cy.wait(200);

  return cy.task<boolean>('fileExists', filePath);
});

Cypress.Commands.add('fileExistsWithL', (filePath: string) => {
  Cypress.log({ name: 'fileExistsWithL', message: 'ss' });
  cy.wait(1000);
  cy.wait(200);

  return cy.task<boolean>('fileExists', filePath);
});

Cypress.Commands.add('nested', (filePath: string) => {
  return cy.fileExistsWithL(filePath);
});

if (Cypress.config('isInteractive')) {
  console.log('DELETE');
  Cypress.Allure.deleteResults();
}
