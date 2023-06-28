export const registerCommands = () => {
  /**
   * Log node
   */
  Cypress.Commands.add('myLog', (message: string) => {
    Cypress.log({ name: 'myLog', message });
    cy.task('log', message);
  });
};
