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
import net from 'net';

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

  on('before:browser:launch', (browser, opts) => {
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

  let server: Server;

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
      const findAvailablePort = async (startPort = 45000): Promise<number> => {
        return new Promise((resolve, reject) => {
          const tryPort = (port: number, attempts = 0): void => {
            if (attempts > 50) {
              reject(new Error('Could not find available port for reporting server'));

              return;
            }

            const server = net.createServer();

            server.listen(port, () => {
              server.close(() => {
                resolve(port);
              });
            });

            server.on('error', () => {
              // Port in use, try next
              tryPort(port + 1, attempts + 1);
            });
          };

          tryPort(startPort);
        });
      };

      const port2 = await findAvailablePort();

      for (let i = 0; i < 30; i++) {
        try {
          server = startTestServer(port ?? port2);

          return port ?? port2;
        } catch (err) {
          // ignore
        }
      }

      return port ?? port2;
    },
    shutDownTestServer() {
      try {
        server?.close(() => {
          console.log('Shutdown');
        });
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
