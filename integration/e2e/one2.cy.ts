import { visitHtml } from '../common/helper';

describe('suite with one test', () => {
  it('#2', () => {
    cy.allure({ task: 'setLabel', arg: { name: 'tag', value: 'My' } });
    cy.wrap(null).then(() => {
      throw new Error('EXPECTED FAIL');
    });
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
