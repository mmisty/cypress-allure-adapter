import { visitHtml } from '../common/helper';

describe('suite with one test', () => {
  it('test pass', function () {
    visitHtml();
    cy.get('div').should('exist');
    cy.myLog('log task');

    expect(0).eq(0);

    cy.get('div:eq(2)').should('exist');
    cy.screenshot('sdsd').then(sc => {
      console.log('SCREENSHOT');
      console.log(sc);
      cy.allure({ task: 'screenshot', arg: { path: 'sdsd' } });
    });

    /*cy.allure({ task: 'stepStarted', arg: { name: 'my step' } });
      cy.allure({ task: 'message', arg: { name: 'MESSAGE' } });
      cy.allure({ task: 'setLabel', arg: { name: 'tag', value: '@value2' } });
      cy.allure({ task: 'setLabel', arg: { name: 'tag', value: '@value2' } });
      cy.allure({ task: 'setLabel', arg: { name: 'PACKAGE', value: '1.2.3' } });
      cy.allure({ task: 'stepEnded', arg: { status: 'failed' } });*/
  });
});
