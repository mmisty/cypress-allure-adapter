describe('suite name todo', () => {
  const visitHtml = (opts: { body: string; script: string }) => {
    cy.intercept('mytest.com**', {
      body: `<html><body>${opts.body}</body</html><script>${opts.script}</script>`,
    });
    cy.visit('mytest.com');
  };

  it('test name todo', () => {
    cy.session('user123', () => {
      cy.log('1');
      cy.setCookie('A', 'AAA');
    });

    // tod restore

    cy.log('next step 2');

    cy.session('123', () => {
      cy.get('div');
      cy.log('step');
    });
    visitHtml({ body: '<div datatest="divel">Hello</div>', script: '' });

    cy.steps('do smth', 'input 1');
    cy.steps('group', () => {
      cy.steps('do smth', 'input 2');
      cy.get('div');
    });
    //  cy.steps('do smth', 'input 3');
    cy.get('div');

    cy.get('[datatest="divel"]').within(() => {
      cy.log('divel');
    });
  });
});
