import { visitHtml } from '../common/helper';

describe('suite with one test', () => {
  before(() => {
    cy.allure().label('tag', 'BEFORE');
  });

  beforeEach(() => {
    cy.allure().label('tag', 'BEFOREEACH');
    cy.log('HELLO)');
  });

  it('#2', () => {
    cy.allure().tag('My');
  });

  it('#1 test fail', function () {
    visitHtml();

    cy.get('div').should('exist');
    cy.myLog('log task');

    expect(0).eq(0);

    cy.get('div:eq(2)').should('not.exist').and('exist');
  });

  it('test simple', () => {
    expect(0).eq(0);

    visitHtml();
    cy.get('body').then(() => {
      cy.allure().startStep('my step');
      cy.screenshot('afterScreen');
      cy.allure().endStep();
    });

    /*.then(sc => {
      console.log('SCREENSHOT');
      console.log(sc);
      cy.allure({ task: 'screenshotOne', arg: { name: 'afterScreen' } });
    });*/
  });
});
