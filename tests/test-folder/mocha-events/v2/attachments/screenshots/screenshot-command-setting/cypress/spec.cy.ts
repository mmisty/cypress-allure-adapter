describe('test screenshot with setting', () => {
  it('01 screenshot test - to step without name', () => {
    cy.allure().startStep('my step');
    cy.screenshot({ allureAttachToStep: true });
    cy.allure().endStep();
  });

  it('02.1 screenshot test - to test without name (with option false)', () => {
    cy.allure().startStep('my step');
    cy.screenshot({ allureAttachToStep: false });
    cy.allure().endStep();
  });

  it('02.2 screenshot test - to test without name (no option)', () => {
    cy.allure().startStep('my step');
    cy.screenshot();
    cy.allure().endStep();
  });

  it('03 screenshot test - to step WITH name', () => {
    cy.allure().startStep('my step');
    cy.screenshot('my-step', { allureAttachToStep: true });
    cy.allure().endStep();
  });

  it('04.1 screenshot test - to step WITH name (with option false)', () => {
    cy.allure().startStep('my step');
    cy.screenshot('my-step', { allureAttachToStep: false });
    cy.allure().endStep();
  });

  it('04.2 screenshot test - to test WITH name (no option)', () => {
    cy.allure().startStep('my step');
    cy.screenshot('my-step');
    cy.allure().endStep();
  });

  it('05 screenshot test - to step WITH name for ELEMENT', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot('my-step', { allureAttachToStep: true });
    cy.allure().endStep();
  });

  it('06.1 screenshot test - to step WITH name (with option false) for ELEMENT', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot('my-step', { allureAttachToStep: false });
    cy.allure().endStep();
  });

  it('06.2 screenshot test - to test WITH name (no option) for ELEMENT', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot('my-step');
    cy.allure().endStep();
  });

  it('07 screenshot test - to step WITH name for ELEMENT no name', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot({ allureAttachToStep: true });
    cy.allure().endStep();
  });

  it('08.1 screenshot test - to step WITH name (with option false) for ELEMENT no name', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot({ allureAttachToStep: false });
    cy.allure().endStep();
  });

  it('08.2 screenshot test - to test WITH name (no option) for ELEMENT no name', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot();
    cy.allure().endStep();
  });
});
