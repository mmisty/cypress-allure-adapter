import Debug from 'debug';
import '../cypress/cypress';
import { registerTags } from '@mmisty/cypress-tags/register';
import { registerCommands } from '../commands';
import { registerMochaReporter, registerStubReporter } from './allure-mocha-reporter';
import { startWsClient } from './websocket';
import { packageLog } from '../common';
import { addGherkin } from '../setup/setup-gherkin';
import { processTagsOnTestStart } from './process-tags';

const debug = Debug('cypress-allure:setup');

export const allureAdapterSetup = () => {
  Cypress.env('cyTagsShowTagsInTitle', Cypress.env('allureShowTagsInTitle') ?? Cypress.env('cyTagsShowTagsInTitle'));

  registerTags();
  registerCommands();

  const ws = startWsClient();

  if (!ws) {
    debug(`${packageLog} No reporting since server could not start`);

    registerStubReporter();

    return;
  }

  registerMochaReporter(ws);
  addGherkin();

  Cypress.Allure.on('test:started', test => {
    processTagsOnTestStart(test);
  });
};
