import { registerCommands } from '../commands';
import { registerMochaReporter } from './reporter2';
import { startWsClient } from './websocket';

export const allureAdapterSetup = () => {
  // here you can do setup for each test file in browser
  beforeEach(() => {
    cy.task('log', 'Registered allureAdapterSetup');
  });

  const ws = startWsClient();
  registerMochaReporter(ws);

  before(() => {
    console.log('before all STARTED: ', ws.readyState);
  });

  registerCommands();
  //registerReporter();
};
