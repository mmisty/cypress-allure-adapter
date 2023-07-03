import { visitHtml } from '../common/helper';

describe('suite with one test', () => {
  before(() => {
    cy.allure({ task: 'setLabel', arg: { name: 'tag', value: 'BEFORE' } });
  });
  beforeEach(() => {
    cy.allure({ task: 'setLabel', arg: { name: 'tag', value: 'BEFOREEACH' } });
    cy.log('HELLO)');
  });

  it('#2', () => {
    cy.allure({ task: 'setLabel', arg: { name: 'tag', value: 'My' } });
  });
  it('#1 test fail', function () {
    visitHtml();

    cy.get('div').should('exist');
    cy.myLog('log task');

    expect(0).eq(0);

    cy.get('div:eq(2)').should('not.exist').and('exist');
    cy.screenshot('sdsd').then(sc => {
      console.log('SCREENSHOT');
      console.log(sc);
      cy.allure({ task: 'screenshotOne', arg: { name: 'sdsd' } });
    });

    /*cy.allure({ task: 'stepStarted', arg: { name: 'my step' } });
      cy.allure({ task: 'message', arg: { name: 'MESSAGE' } });
      cy.allure({ task: 'setLabel', arg: { name: 'tag', value: '@value2' } });
      cy.allure({ task: 'setLabel', arg: { name: 'tag', value: '@value2' } });
      cy.allure({ task: 'setLabel', arg: { name: 'PACKAGE', value: '1.2.3' } });
      cy.allure({ task: 'stepEnded', arg: { status: 'failed' } });*/
  });

  it('test simple', () => {
    expect(0).eq(0);

    visitHtml();
    cy.get('body').then(() => {
      cy.allure({ task: 'stepStarted', arg: { name: 'my step' } });
      cy.screenshot('afterScreen');
      cy.allure({ task: 'stepEnded', arg: { status: 'passed' } });
    });

    /*.then(sc => {
      console.log('SCREENSHOT');
      console.log(sc);
      cy.allure({ task: 'screenshotOne', arg: { name: 'afterScreen' } });
    });*/
  });
});
