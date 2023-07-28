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
});
