import Debug from 'debug';
import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { allureTasks, ReporterOptions } from './allure';
import { startReporterServer } from './server';
import {
  startReportingServer as startFsServer,
  stopReportingServer,
  REPORTING_SERVER_PORT_ENV,
} from './reporting-server';
import type { AfterSpecScreenshots, AllureTasks } from './allure-types';
import { logWithPackage } from '../common';

const debug = Debug('cypress-allure:plugins');

// this runs in node
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const configureAllureAdapterPlugins = async (
  on: PluginEvents,
  config: PluginConfigOptions,
): Promise<AllureTasks | undefined> => {
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
    screenshots: config.screenshotsFolder || 'no', // todo when false
    videos: config.videosFolder,
    isTest: config.env['JEST_TEST'] === 'true' || config.env['JEST_TEST'] === true,
  };

  debug('OPTIONS:');
  debug(JSON.stringify(options, null, ' '));

  // Start the reporting server for async filesystem operations
  const fsServer = await startFsServer();
  config.env[REPORTING_SERVER_PORT_ENV] = fsServer.getPort();

  if (config.env['allureCleanResults'] === 'true' || config.env['allureCleanResults'] === true) {
    debug('Clean results');

    // Fire and forget - clean and create directories
    if (fsServer.existsSync(options.allureResults)) {
      debug(`Deleting ${options.allureResults}`);
      fsServer.removeFile(options.allureResults);
    }

    if (fsServer.existsSync(options.techAllureResults)) {
      debug(`Deleting ${options.techAllureResults}`);
      fsServer.removeFile(options.techAllureResults);
    }

    fsServer.mkdir(options.allureResults, { recursive: true });
    fsServer.mkdir(options.techAllureResults, { recursive: true });

    // Wait for cleanup to complete
    await fsServer.flush();
  }

  const reporter = allureTasks(options, fsServer);
  debug('Registered with options:');
  debug(options);

  startReporterServer(config, reporter);

  // todo cleanup
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
    await stopReportingServer();
    logWithPackage('log', 'Processing all files finished');
  });

  return reporter;
};
