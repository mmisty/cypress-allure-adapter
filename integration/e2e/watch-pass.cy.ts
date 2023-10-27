describe('should move passed test right away - all passed @watch', () => {
  describe('more suite', () => {
    before(() => {
      cy.allure().step('some setup');
    });

    for (let i = 0; i < 10; i++) {
      it(`test ${i}`, () => {
        cy.allure().step('hello');
        cy.allure().startStep('with attach');
        cy.allure().attachment('out', `test number ${i}`, 'text/plain');
        cy.allure().endStep();

        cy.allure().startStep('with attach other');
        cy.allure().attachment('out2', `test number ${i} - attach 2`, 'text/plain');
        cy.allure().endStep();

        cy.allure().startStep('may fail');
        cy.wait(100);
        cy.allure().endStep();
      });
    }
  });
});
