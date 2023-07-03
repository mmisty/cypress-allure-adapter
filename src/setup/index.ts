import Debug from 'debug';
import { registerCommands } from '../commands';
import { registerMochaReporter } from './allure-mocha-reporter';
import { startWsClient } from './websocket';

const debug = Debug('cypress-allure:plugins');

export const allureAdapterSetup = () => {
  registerCommands();

  const ws = startWsClient();

  if (!ws) {
    debug('No reporting since server could not start');

    return;
  }

  registerMochaReporter(ws);
};
