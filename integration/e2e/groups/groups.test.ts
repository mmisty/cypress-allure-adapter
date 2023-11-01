// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
  export interface Chainable {
    step(name: string): Chainable<any>;
    other(name: string): Chainable<any>;
  }
}

describe('groupped', () => {
  Cypress.Commands.add('other', name => {
    Cypress.log({ name: 'other', message: name, groupStart: true, type: 'parent' } as any);
    cy.log('other').then(() => {
      Cypress.log({ emitOnly: true, groupEnd: true } as any);
    });
  });
  Cypress.Commands.add('step', name => {
    Cypress.log({ name: 'group', message: name, groupStart: true, type: 'parent' } as any);
    cy.wait(200).then(() => {
      //
    });
    cy.other('step NESTED');
    cy.log('hello').then(() => {
      Cypress.log({ emitOnly: true, groupEnd: true } as any);
    });
    // cy.pause();
  });

  it('test', () => {
    cy.step('step 1');
    cy.other('step Paretn');
    // cy.step('step 2');
    // cy.step('step 3');
    // cy.step('step 4');
    // cy.step('step 5');
  });
});
