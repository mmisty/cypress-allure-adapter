import { visitHtml } from '../../common/helper';

describe('should pass', () => {
  beforeEach(() => {
    visitHtml();
  });

  it('custom command nesting test', () => {
    cy.get('div').eq(0).should('exist');
  });

  it('custom command nesting test 2', () => {
    cy.otherCmd('hello'); // .should('be', true);
    cy.get('div').eq(0).should('exist');
  });

  it('chainable', () => {
    cy.fileExists('nonexis1');

    cy.fileExists('nonexis').then(t => {
      cy.log(`${t}`);
      expect(t).to.eq(false);
    });
    cy.log('234');
  });

  it('c1', () => {
    cy.fileExists('nonexis1').should(t => expect(t).eq(false));
    cy.fileExists('nonexis3').then(() => {
      console.log('nonexis3');
      cy.log('nonexis3');
      expect(true).eq(true);
    });
    cy.get('div').eq(0).should('exist');
    expect(1).eq(1);
  });

  it('c2', () => {
    cy.get('div').returnGet().should('not.exist');
  });
  it('c2-2', () => {
    cy.get('div').returnGet().should('not.exist');
    cy.get('div').eq(0).should('exist');
  });
  it('c3', () => {
    cy.fileExistsWithL('file').should('eq', false);
  });
  it('nested custom', () => {
    cy.nested('file').should('eq', false);
  });
  it('nested custom with all', () => {
    cy.nested('file').should('eq', false);
    cy.allure().tag('123');
  });

  it('test event', () => {
    Cypress.Allure.on('cmd:ended', (cmd, isCustom) => {
      console.log(`sasasa${isCustom}`);
      console.log(cmd);
      console.log(cmd?.attributes?.name);

      if (isCustom) {
        Cypress.Allure.tag(cmd?.attributes?.name);
      }
    });
    cy.nested('file').should('eq', false);
  });
});
