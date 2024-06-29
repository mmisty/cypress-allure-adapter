import { After, Before, Then } from '@badeball/cypress-cucumber-preprocessor';

Then('This step should fail', () => {
  cy.wrap({ a: 1 }).then(t => {
    expect(t).eq(2);
  });
});

Then('This step should fail - long', () => {
  let i = 0;
  cy.window().should(t => {
    i++;
    expect(i).eq(500);
  });
});

After({ tags: '@fail-after' }, () => {
  expect(true, 'failed in after each hook').to.be.false;
});

Before({ tags: '@fail-before' }, () => {
  expect(true, 'failed in before each hook').to.be.false;
});
