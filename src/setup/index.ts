import Debug from 'debug';
import { registerCommands } from '../commands';
import { registerMochaReporter, registerStubReporter } from './allure-mocha-reporter';
import { startWsClient } from './websocket';
import { packageLog, parseBoolean } from '../common';
import { registerCypressGrep } from '@mmisty/cypress-grep';

const debug = Debug('cypress-allure:setup');

export const allureAdapterSetup = () => {
  registerCypressGrep({
    addControlToUI: !Cypress.env('allureAddGrepUI') ? true : parseBoolean(Cypress.env('allureAddGrepUI')),
  });

  registerCommands();

  const ws = startWsClient();

  if (!ws) {
    debug(`${packageLog} No reporting since server could not start`);

    registerStubReporter();

    return;
  }

  registerMochaReporter(ws);
};
