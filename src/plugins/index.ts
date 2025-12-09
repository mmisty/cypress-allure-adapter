import Debug from 'debug';
import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { allureTasks, ReporterOptions } from './allure';
import { startReporterServer } from './server';
import { AllureTaskClient, stopAllureTaskServer, TaskClientMode } from './allure-task-client';
import type { AfterSpecScreenshots, AllureTasks } from './allure-types';
import { logWithPackage } from '../common';

const debug = Debug('cypress-allure:plugins');

/**
 * Environment variable to control the task server mode
 * - 'remote': All operations run in a separate process (recommended for production)
 * - 'local': All operations run in the same process (legacy behavior)
 */
const ALLURE_MODE_ENV = 'ALLURE_MODE';

/**
 * Get the task client mode from environment or config
 */
const getTaskClientMode = (config: PluginConfigOptions): TaskClientMode => {
  // Check environment variable first
  const envMode = process.env[ALLURE_MODE_ENV];

  if (envMode === 'local' || envMode === 'remote') {
    return envMode;
  }

  // Check cypress config
  const configMode = config.env['allureMode'];

  if (configMode === 'local' || configMode === 'remote') {
    return configMode;
  }

  // Default to 'remote' for better performance
  return 'remote';
};

// this runs in node
export const configureAllureAdapterPlugins = (
  on: PluginEvents,
  config: PluginConfigOptions,
): AllureTasks | undefined => {
  if (process.env.DEBUG) {
    config.env['DEBUG'] = process.env.DEBUG;
  }

  if (config.env['GREP_PRE_FILTER'] === 'true' || config.env['GREP_PRE_FILTER'] === true) {
    debug('Not running allure in prefiltering mode');

    return undefined;
  }

  if (config.env['allure'] !== 'true' && config.env['allure'] !== true) {
    debug('Not running allure. Set "allure" env variable to "true" to generate allure-results');

    return undefined;
  }

  debug('Register plugin');

  const results = config.env['allureResults'] ?? 'allure-results';
  const watchResultsPath = config.env['allureResultsWatchPath'];

  const allureAddVideoOnPass =
    config.env['allureAddVideoOnPass'] === true || config.env['allureAddVideoOnPass'] === 'true';

  const showDuplicateWarn = config.env['allureShowDuplicateWarn']
    ? config.env['allureShowDuplicateWarn'] === true || config.env['allureShowDuplicateWarn'] === 'true'
    : false;

  const options: ReporterOptions = {
    showDuplicateWarn,
    allureAddVideoOnPass,
    allureResults: results,
    techAllureResults: watchResultsPath ?? results,
    allureSkipSteps: config.env['allureSkipSteps'] ?? '',
    screenshots: config.screenshotsFolder || 'no',
    videos: config.videosFolder,
    isTest: config.env['JEST_TEST'] === 'true' || config.env['JEST_TEST'] === true,
  };

  debug('OPTIONS:');
  debug(JSON.stringify(options, null, ' '));

  // Determine mode
  const mode = getTaskClientMode(config);
  debug(`Task client mode: ${mode}`);

  // Create the task client
  const client = new AllureTaskClient(mode);

  // Start the task server with timeout guard (async - doesn't block Cypress startup)
  const SERVER_START_TIMEOUT = 20000; // 20 seconds max wait

  const startWithTimeout = async () => {
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task server startup timed out after ${SERVER_START_TIMEOUT / 1000}s`));
      }, SERVER_START_TIMEOUT);
    });

    try {
      await Promise.race([client.start(), timeoutPromise]);
    } catch (err) {
      logWithPackage('error', `Failed to start task server: ${(err as Error).message}`);
      logWithPackage('warn', 'Allure reporting may be incomplete - continuing without task server');
    }
  };

  // Fire and forget - don't block Cypress startup
  startWithTimeout();

  // Create reporter first so we can use task manager for cleanup
  const reporter = allureTasks(options, client);
  debug('Registered with options:');
  debug(options);

  // Clean results if requested - use async operations via task manager (doesn't block)
  if (config.env['allureCleanResults'] === 'true' || config.env['allureCleanResults'] === true) {
    debug('Clean results (async)');

    // Queue cleanup operations - these will execute asynchronously
    // and complete before the first spec starts
    const { taskManager } = reporter;

    // Remove and recreate allure results directory
    taskManager.addOperation('__cleanup__', {
      type: 'fs:removeFile',
      path: options.allureResults,
    });

    taskManager.addOperation('__cleanup__', {
      type: 'fs:mkdir',
      path: options.allureResults,
      options: { recursive: true },
    });

    // Remove and recreate watch directory if different
    if (options.techAllureResults !== options.allureResults) {
      taskManager.addOperation('__cleanup__', {
        type: 'fs:removeFile',
        path: options.techAllureResults,
      });

      taskManager.addOperation('__cleanup__', {
        type: 'fs:mkdir',
        path: options.techAllureResults,
        options: { recursive: true },
      });
    }
  }

  // Start WebSocket server async - doesn't block Cypress startup
  startReporterServer(config, reporter).catch(err => {
    logWithPackage('error', `Failed to start reporter server: ${(err as Error).message}`);
  });

  config.reporterOptions = {
    ...config.reporterOptions,
    url: config.reporterUrl,
  };

  on('after:spec', async (spec, res: unknown) => {
    const results: CypressCommandLine.RunResult & AfterSpecScreenshots = res as CypressCommandLine.RunResult &
      AfterSpecScreenshots;
    await reporter.afterSpec({ results });
  });

  on('after:run', async (_results: CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult) => {
    debug('after:run');
    await reporter.waitAllFinished({});
    await stopAllureTaskServer();
    logWithPackage('log', 'Processing all files finished');
  });

  return reporter;
};
