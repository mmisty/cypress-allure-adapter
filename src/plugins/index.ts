import Debug from 'debug';
import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { allureTasks, ReporterOptions } from './allure';
import { startReporterServer } from './server';
import AutoScreen = Cypress.AutoScreen;

const debug = Debug('cypress-allure:plugins');

// this runs in node
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const configureEnv = (on: PluginEvents, config: PluginConfigOptions) => {
  // do setup with events and env, register tasks
  // register plugin events
  debug('Register plugin');

  const options: ReporterOptions = {
    allureResults: config?.reporterOptions?.allureResults ?? 'allure-results',
    screenshots: config.screenshotsFolder || 'no', // todo when false
    videos: config.videosFolder,
  };
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
    reporter.attachScreenshots({ screenshots: scr });

    reporter.attachVideoToTests({ path: results.video ?? '' });
  });
};
