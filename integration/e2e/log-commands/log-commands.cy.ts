import { visitHtml } from '../../common/helper';

describe('log-not log commands', () => {
  before(() => {
    cy.log('before setup');
  });
  beforeEach(() => {
    cy.log('hello');
  });

  beforeEach('my hook', () => {
    cy.log('hello');
  });

  afterEach(() => {
    cy.log('hello');
  });

  afterEach('my hook', () => {
    cy.log('hello');
  });

  it('should switch env var and do not log commands betweenn', () => {
    visitHtml();
    cy.wrap(null, { log: false }).then(() => {
      Cypress.expose('allureLogCyCommands', false);
    });
    cy.get('div');
    cy.wrap(null, { log: false }).then(() => {
      Cypress.expose('allureLogCyCommands', true);
    });
  });

  it('should run', () => {
    visitHtml();
    cy.wrap(null, { log: false }).then(() => {
      Cypress.expose('allureLogCyCommands', false);
    });
    cy.get('div');
    cy.wrap(null, { log: false }).then(() => {
      Cypress.expose('allureLogCyCommands', true);
    });
  });
});
