import Debug from 'debug';
import { registerCommands } from '../commands';
import { registerMochaReporter, registerStubReporter } from './allure-mocha-reporter';
import { startWsClient } from './websocket';
import { packageLog } from '../common';
import '@mmisty/cypress-tags';

const debug = Debug('cypress-allure:setup');

export const allureAdapterSetup = () => {
  registerCommands();

  const ws = startWsClient();

  if (!ws) {
    debug(`${packageLog} No reporting since server could not start`);

    registerStubReporter();

    return;
  }

  registerMochaReporter(ws);
};
