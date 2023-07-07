import Debug from 'debug';
import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { allureTasks, ReporterOptions } from './allure';
import { startReporterServer } from './server';
import { existsSync, mkdirSync, rmSync } from 'fs';
import type { AllureTasks, AutoScreen } from './allure-types';

const debug = Debug('cypress-allure:plugins');

// this runs in node
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const configureEnv = (on: PluginEvents, config: PluginConfigOptions): AllureTasks | undefined => {
  // do setup with events and env, register tasks
  // register plugin events
  if (process.env.DEBUG) {
    config.env['DEBUG'] = process.env.DEBUG;
  }

  if (config.env['allure'] !== 'true' && config.env['allure'] !== true) {
    debug('Not running allure. Set "allure" env variable to "true" to generate allure-results');

    return undefined;
  }

  debug('Register plugin');

  const options: ReporterOptions = {
    allureResults: config.env['allureResults'] ?? 'allure-results',
    screenshots: config.screenshotsFolder || 'no', // todo when false
    videos: config.videosFolder,
  };

  if (config.env['allureCleanResults'] === 'true' || config.env['allureCleanResults'] === true) {
    debug('Clean results');

    if (existsSync(options.allureResults)) {
      debug(`Deleting allure-results: ${options.allureResults}`);

      try {
        rmSync(options.allureResults, { recursive: true });
      } catch (err) {
        debug(`Error deleting allure-results: ${(err as Error).message}`);
      }

      try {
        mkdirSync(options.allureResults);
      } catch (err) {
        debug(`Error creating allure-results: ${(err as Error).message}`);
      }
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

  on('after:spec', (spec, results) => {
    debug('AFTER SPEC');
    const scr = (results as any).screenshots as AutoScreen[];
    debug(scr);
    // reporter.attachScreenshots({ screenshots: scr });
    reporter.attachVideoToTests({ path: results.video ?? '' });
    // repuload with new ids for testops
  });

  return reporter;
};
