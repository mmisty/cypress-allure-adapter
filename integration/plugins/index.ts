import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { preprocessor } from './ts-preprocessor';
import { existsSync, rmdirSync } from 'fs';
import { resolve } from 'path';
import { COVERAGE } from '../common/constants';
import { pluginGrep } from '@mmisty/cypress-grep/plugins';
import { redirectLogBrowser } from 'cypress-redirect-browser-log/plugins';
import { configureAllureAdapterPlugins } from '@src/plugins';
import { startTestServer } from './test-server';
import { Server } from 'http';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { EventForwarder } from './events-forwarder';

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
const eventForwarder = new EventForwarder();

export const setupPlugins = async (cyOn: PluginEvents, config: PluginConfigOptions) => {
  const { on } = eventForwarder;
  clearJsFiles();
  const isCov = isCoverage(config);

  if (isCov) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@cypress/code-coverage/task')(on, config);
    console.log('SETTING UP COVERAGE');
    config.env[COVERAGE] = true;
  }

  const browserHandler = redirectLogBrowser(config, ['error', 'exception', 'warn', 'test:log']);
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  on('after:browser:launch', () => {
    console.log('after browser started');
  });

  on('before:browser:launch', (browser, opts) => {
    console.log('before starting browser..');

    // Add Chrome args for CI stability
    if (isCI && browser.family === 'chromium') {
      opts.args.push('--disable-gpu');
      opts.args.push('--no-sandbox');
      opts.args.push('--disable-sync');
      opts.args.push('--disable-translate');
      opts.args.push('--mute-audio');
      opts.args.push('--no-first-run');
      opts.args.push('--safebrowsing-disable-auto-update');
    }

    return browserHandler(browser, opts);
  });

  cyOn('file:preprocessor', preprocessor(isCov, config));

  await addCucumberPreprocessorPlugin(on, config);

  const allure = configureAllureAdapterPlugins(on, config);

  on('before:run', details => {
    allure?.writeEnvironmentInfo({
      info: {
        os: details.system.osName,
        osVersion: details.system.osVersion,
      },
    });
  });

  console.log('CYPRESS ENV:');
  console.log(config.env);

  // register grep plugin
  pluginGrep(on, config);

  let server: Server | null = null;

  on('task', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log: (...args: any[]) => {
      console.log(...args);

      return null;
    },
    fileExists: (filePath: string) => {
      return existsSync(filePath);
    },
    async startTestServer(port?: number) {
      try {
        const result = await startTestServer(port);
        server = result.server;

        return result.port;
      } catch (err) {
        console.log(`Tests: starting test server failed: ${(err as Error).message}`);

        return null;
      }
    },
    shutDownTestServer() {
      try {
        server?.close(() => {
          console.log('Shutdown');
        });
        server = null;
      } catch (err) {
        // ignore
      }

      return null;
    },
  });

  on('after:screenshot', details => {
    console.log(`SCREENSHOT: ${details.path}`);
  });

  eventForwarder.forward(cyOn);

  // It's IMPORTANT to return the config object
  // with any changed environment variables
  return config;
};
