import { registerCommands } from '../commands';
import { registerLogs } from './client-logs';

export const allureAdapterSetup = () => {
  // here you can do setup for each test file in browser
  beforeEach(() => {
    cy.task('log', 'Registered allureAdapterSetup');
  });

  registerCommands();
  registerLogs();
};
