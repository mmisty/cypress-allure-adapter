import { registerCommands } from '../commands';
import { registerMochaReporter } from './reporter2';
import { startWsClient } from './websocket';

export const allureAdapterSetup = () => {
  // here you can do setup for each test file in browser
  beforeEach(() => {
    cy.log('log', 'Registered allureAdapterSetup');
  });

  registerCommands();

  const ws = startWsClient();

  if (!ws) {
    console.log('No reporting since server could not start');

    return;
  }

  registerMochaReporter(ws);

  before(() => {
    console.log('before all STARTED: ', ws.readyState);
  });
};
