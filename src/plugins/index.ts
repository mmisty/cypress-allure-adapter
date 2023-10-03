import Debug from 'debug';
import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { allureTasks, ReporterOptions } from './allure';
import { startReporterServer } from './server';
import { existsSync, mkdirSync, rmSync } from 'fs';
import type { AllureTasks } from './allure-types';

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
    allureSkipCommands: config.env['allureSkipCommands'] ?? '',
    screenshots: config.screenshotsFolder || 'no', // todo when false
    videos: config.videosFolder,
    isTest: config.env['JEST_TEST'] === 'true' || config.env['JEST_TEST'] === true,
  };

  debug('OPTIONS:');
  debug(JSON.stringify(options, null, ' '));

  if (config.env['allureCleanResults'] === 'true' || config.env['allureCleanResults'] === true) {
    debug('Clean results');

    const cleanDir = (dir: string) => {
      if (!existsSync(dir)) {
        return;
      }

      debug(`Deleting ${dir}`);

      try {
        rmSync(dir, { recursive: true });
      } catch (err) {
        debug(`Error deleting ${dir}: ${(err as Error).message}`);
      }
    };

    cleanDir(options.allureResults);
    cleanDir(options.techAllureResults);

    try {
      mkdirSync(options.allureResults, { recursive: true });
      mkdirSync(options.techAllureResults, { recursive: true });
    } catch (err) {
      debug(`Error creating allure-results: ${(err as Error).message}`);
    }
  }

  const reporter = allureTasks(options);
  debug('Registered with options:');
  debug(options);

  startReporterServer(config, reporter);

  // todo cleanup
  config.reporterOptions = {
    ...config.reporterOptions,
    url: config.reporterUrl,
  };

  // process.on('message', (message: any) => {
  //   const [event, , args] = message.args;
  //   /*console.log('message');
  //   console.log(message);
  //   console.log(message.args);*/
  //
  //   if (message.event !== 'preprocessor:close') {
  //     return;
  //   }
  //   console.log(message);
  //   const [spec] = message.args;
  //   console.log(spec);
  //   //const [spec, results] = args;
  //   reporter.suiteStarted({ fullTitle: 'd', title: 'video' });
  //   reporter.testStarted({ fullTitle: spec, title: spec, id: spec });
  //   reporter.video({ path: 'd' });
  //   reporter.testEnded({ result: 'passed' });
  //   reporter.suiteEnded({});
  // });

  on('after:spec', async (spec, results) => {
    await reporter.afterSpec({ results });
  });

  return reporter;
};
