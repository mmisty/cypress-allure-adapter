describe('add env', () => {
  it('test 1 - should have 1 step screenshot', () => {
    cy.allure().writeEnvironmentInfo({ OS: 'UBUNTU' });
    cy.allure().addEnvironmentInfo({ verison: '12.3' });
    cy.allure().addEnvironmentInfo({ verison: '12.4' });
  });
});
