import { registerCommands } from '../commands';

export const myPluginSetup = () => {
  // here you can do setup for each test file in browser
  beforeEach(() => {
    cy.task('log', 'Registered my plugin');
  });

  registerCommands();
};
