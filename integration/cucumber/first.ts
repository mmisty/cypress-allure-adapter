import { Then } from '@badeball/cypress-cucumber-preprocessor';

Then('This step should fail', () => {
  cy.wrap({ a: 1 }).then(t => {
    expect(t).eq(2);
  });
});
