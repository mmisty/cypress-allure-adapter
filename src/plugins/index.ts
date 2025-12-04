import Debug from 'debug';
import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { allureTasks, ReporterOptions } from './allure';
import { startReporterServer } from './server';
import {
  startReportingServer,
  stopReportingServer,
  REPORTING_SERVER_PORT_ENV,
  ReportingServer,
} from './reporting-server';
import type { AfterSpecScreenshots, AllureTasks } from './allure-types';
import { logWithPackage } from '../common';

const debug = Debug('cypress-allure:plugins');

// this runs in node
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    screenshots: config.screenshotsFolder || 'no', // todo when false
    videos: config.videosFolder,
    isTest: config.env['JEST_TEST'] === 'true' || config.env['JEST_TEST'] === true,
  };

  debug('OPTIONS:');
  debug(JSON.stringify(options, null, ' '));

  // Start the reporting server for async filesystem operations
  const reportingServer = new ReportingServer();
  // config.env[REPORTING_SERVER_PORT_ENV] = reportingServer.getPort();

  if (config.env['allureCleanResults'] === 'true' || config.env['allureCleanResults'] === true) {
    debug('Clean results');

    const cleanDir = (dir: string) => {
      const exists = reportingServer.existsSync(dir);

      if (!exists) {
        return;
      }

      debug(`Deleting ${dir}`);

      try {
        reportingServer.removeFileSync(dir);
      } catch (err) {
        debug(`Error deleting ${dir}: ${(err as Error).message}`);
      }
    };

    cleanDir(options.allureResults);
    cleanDir(options.techAllureResults);

    try {
      reportingServer.mkdirSync(options.allureResults, { recursive: true });
      reportingServer.mkdirSync(options.techAllureResults, { recursive: true });
    } catch (err) {
      debug(`Error creating allure-results: ${(err as Error).message}`);
    }
  }

  const reporter = allureTasks(options, reportingServer);
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
