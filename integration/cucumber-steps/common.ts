import { When, Then, Given } from '@badeball/cypress-cucumber-preprocessor';

When('I visit site', () => {
  cy.log('visit site');
});

Then('I should see a search bar {string}', (text: string) => {
  cy.log(text);
});

Given('I log message {string}', (text: string) => {
  cy.log(text);
});
