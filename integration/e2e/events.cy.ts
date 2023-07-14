Cypress.Allure.on('test:started', test => {
  console.log(`test:started from test: ${test.title}`);
});

describe('suite', () => {
  Cypress.Allure.on('test:started', test => {
    console.log(`test:started 2 from test: ${test.title}`);
    Cypress.Allure.label('event', 'started');
    Cypress.Allure.label('tag', 'started');
    Cypress.Allure.step('after start');
    console.log('AFTER TEST STARTED');
  });

  Cypress.Allure.on('test:ended', test => {
    console.log(`test:ended 2 from test: ${test.title}`);
    Cypress.Allure.label('event', 'started');
    Cypress.Allure.label('tag', 'ended');
    Cypress.Allure.step('before end');
    console.log('BEFORE ENDING TEST');
  });

  it('test1', () => {
    cy.log('Hello');
  });

  it('test2', () => {
    cy.log('Hello');
  });
});
