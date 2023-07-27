import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { preprocessor } from './ts-preprocessor';
import { existsSync, rmdirSync } from 'fs';
import { resolve } from 'path';
import { COVERAGE } from '../common/constants';
import { pluginGrep } from '@mmisty/cypress-grep/plugins';
import { redirectLogBrowser } from 'cypress-redirect-browser-log/plugins';
import { configureAllureAdapterPlugins } from '@src/plugins';

/**
 * Clear compiled js files from previous runs, otherwise coverage will be messed up
 */
const clearJsFiles = () => {
  // remove previous in
  const jsFiles = resolve('js-files-cypress');

  if (existsSync(jsFiles)) {
    rmdirSync(jsFiles, { recursive: true });
  }
};

const isCoverage = (config: PluginConfigOptions) => {
  return process.env[COVERAGE] === 'true' || config.env[COVERAGE] === true;
};

export const setupPlugins = (on: PluginEvents, config: PluginConfigOptions) => {
  clearJsFiles();
  const isCov = isCoverage(config);

  if (isCov) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@cypress/code-coverage/task')(on, config);
    console.log('SETTING UP COVERAGE');
    config.env[COVERAGE] = true;
  }

  const browserHandler = redirectLogBrowser(config, ['error', 'exception', 'warn', 'test:log']);

  on('before:browser:launch', (browser, opts) => {
    return browserHandler(browser, opts);
  });

  configureAllureAdapterPlugins(on, config);

  on('file:preprocessor', preprocessor(isCov));

  console.log('CYPRESS ENV:');
  console.log(config.env);

  // register grep plugin
  pluginGrep(on, config);

  on('task', {
    log: (...args: any[]) => {
      console.log(...args);

      return null;
    },
    fileExists: (filePath: string) => {
      return existsSync(filePath);
    },
  });

  on('after:screenshot', details => {
    console.log(`SCREENSHOT: ${details.path}`);
  });

  // It's IMPORTANT to return the config object
  // with any changed environment variables
  return config;
};
