describe('screenshot command', () => {
  it('0010 screenshot test (no option)', () => {
    cy.screenshot('my-test');
  });

  it('0020 screenshot test no name (no option)', () => {
    cy.screenshot();
  });

  it('0021 screenshot test - to test without name (no option)', () => {
    cy.allure().startStep('my step');
    cy.screenshot();
    cy.allure().endStep();
  });

  it('0022 screenshot test - to test WITH name (no option)', () => {
    cy.allure().startStep('my step');
    cy.screenshot('my-step');
    cy.allure().endStep();
  });

  it('0023 screenshot test - to test WITH name (no option) for ELEMENT', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot('my-step');
    cy.allure().endStep();
  });

  it('0024 screenshot test - to test WITH name (no option) for ELEMENT no name', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot();
    cy.allure().endStep();
  });

  it('0030 screenshot test - to step with setting and name', () => {
    cy.allure().startStep('do operation');
    cy.screenshot('my-test', { allureAttachToStep: true });
    cy.allure().endStep();
  });

  it('0040 screenshot test - to test with setting and name', () => {
    cy.allure().startStep('do operation');
    cy.screenshot('my-test', { allureAttachToStep: false });
    cy.allure().endStep();
  });

  it('0050 screenshot test - to step without name', () => {
    cy.allure().startStep('my step');
    cy.screenshot({ allureAttachToStep: true });
    cy.allure().endStep();
  });

  it('0060 screenshot test - to test without name (with option false)', () => {
    cy.allure().startStep('my step');
    cy.screenshot({ allureAttachToStep: false });
    cy.allure().endStep();
  });

  it('0070 screenshot test - to step WITH name for ELEMENT', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot('my-step', { allureAttachToStep: true });
    cy.allure().endStep();
  });

  it('0080 screenshot test - to step WITH name (with option false) for ELEMENT', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot('my-step', { allureAttachToStep: false });
    cy.allure().endStep();
  });

  it('0090 screenshot test - to step WITH name for ELEMENT no name', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot({ allureAttachToStep: true });
    cy.allure().endStep();
  });

  it('0100 screenshot test - to step WITH name (with option false) for ELEMENT no name', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot({ allureAttachToStep: false });
    cy.allure().endStep();
  });
});
