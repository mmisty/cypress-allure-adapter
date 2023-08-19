import { visitHtml } from '../../common/helper';

describe('should pass', () => {
  // Cypress.Allure.on('cmd:started', cmd => {
  //   console.log(`Started ${cmd.attributes.name} ${cmd.attributes.isCustom}`);
  // });
  // Cypress.Allure.on('cmd:ended', cmd => {
  //   console.log(`ENDED${cmd.attributes.name}`);
  // });
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

  it('01 cmd', () => {
    cy.qaId('link-2').click();
    cy.qaId('link-3').click();
    cy.fileExists('nonexis1').should(t => expect(t).eq(false));
  });

  it('should should', () => {
    Cypress.Commands.add('qa', qaId => {
      cy.qaId(qaId).should('exist');
    });
    cy.qa('link-2').should('be.visible');
  });

  Cypress.Commands.add('qaIdNested', (qaId = {}) => {
    cy.qaId(qaId).should('exist').click();
    cy.qaId(qaId).should('exist').click();
    // cy.qaId(qaId).should('exist');
  });

  Cypress.Commands.add('qaIdNested2', (qaId = {}) => {
    cy.qaId(qaId);
    // cy.qaId(qaId).should('exist');
  });

  it('cmdnest', () => {
    cy.qaIdNested('link-2').click();
    cy.qaId('link-3').click();
  });

  it('syncCmd', () => {
    setTimeout(() => {
      Cypress.$('a:eq(0)').after('<a href="#123" data-qa-id="that-one">123</a>');
    }, 1000);

    cy.get('[data-qa-id="that-one"]')
      .doSyncCommand(subj => {
        Cypress.log({ name: 'sync', message: `message after get command resolved ${subj.text()}` });
      })
      .click()
      .should('have.text', '123');
  });

  it('syncCmdNoSubj', () => {
    setTimeout(() => {
      Cypress.$('a:eq(0)').after('<a href="#123" data-qa-id="that-one">123</a>');
    }, 1000);

    cy.doSyncCommand(t => {
      Cypress.log({ name: 'sync', message: `first ${t}` });
    })
      .get('[data-qa-id="that-one"]')
      .doSyncCommand(subj => {
        Cypress.log({ name: 'sync', message: `message after get command resolved ${subj.text()}` });
      })
      .click()
      .should('have.text', '123');
  });

  it('cmdnest2', () => {
    cy.qaIdNested2('link-2').click();
    cy.qaIdNested2('link-5').click();
  });

  it('cmd1', () => {
    cy.qaId('link-2').click();
  });

  it('cmd2', () => {
    cy.qaId('link-5').should('not.exist');
  });

  it('cmd3 - several should', () => {
    cy.qaId('link-2').should('exist').should('be.visible');
  });
  it('user commands', () => {
    cy.allure().startStep('get link and check exist');
    cy.qaId('link-2').should('exist').should('be.visible');
    cy.allure().endStep();

    //cy.allure().startStep('request');
    cy.request('/api/123').its('status').should('eq', 200);
    //cy.allure().endStep();
  });

  Cypress.Commands.add('tasklog', message => {
    cy.task('log', message);
  });

  Cypress.Commands.add('tasklogWithCypressLog', message => {
    Cypress.log({ name: 'tasklogWithCypressLog', message: 'something' });
    cy.task('log', message);
  });

  Cypress.Commands.add('returnGet', { prevSubject: true }, (subj, message) => {
    cy.task('log', message);

    return cy.wrap(subj).get('div:eq(100)');
  });

  Cypress.Commands.add('returnGet2', { prevSubject: true }, (subj, message) => {
    cy.task('log', message);

    //cy.wrap(subj).get('div:eq(100)');
    cy.get('div:eq(100)');
  });

  Cypress.Commands.add('wrapsub', { prevSubject: true }, subj => {
    cy.wrap(subj);
  });

  Cypress.Commands.add('returnTaskValue', filePath => {
    cy.wait(1);
    cy.wait(2);

    return cy.task('fileExists', filePath);
  });

  Cypress.Commands.add('nestedCommand', filePath => {
    return cy.returnTaskValue(filePath);
  });

  Cypress.Commands.add('specialIgnoredCommand', filePath => {
    return cy.nestedCommand(filePath);
  });

  describe('should pass', () => {
    it('tasklog', () => {
      cy.tasklog('hello');
      cy.get('div').should('exist');
    });

    it('tasklogWithCypressLog', () => {
      cy.tasklogWithCypressLog('hello');
      cy.get('div').should('exist');
    });

    it('returnGet', () => {
      cy.tasklog('hello').returnGet('hello').should('not.exist');
      cy.get('div').should('exist');
    });
    it('wrapsub', () => {
      cy.get('div').wrapsub('hello').should('exist');
      cy.log('next');
      cy.get('div').should('exist');
    });

    it('returnGet2', () => {
      cy.tasklog('hello').returnGet2('hello').should('not.exist');
      cy.get('div').should('exist');
    });

    it('returnTaskValue', () => {
      cy.returnTaskValue('nonexistingd').should('eq', false);
    });

    it('nestedCommand', () => {
      cy.nestedCommand('nonexistingd2').should('eq', false);
    });

    it('not log command', () => {
      cy.get('div', { log: false }).should('exist');
    });

    it('ignore custom command', () => {
      cy.specialIgnoredCommand('nonexistingd2');
    });
  });
});
