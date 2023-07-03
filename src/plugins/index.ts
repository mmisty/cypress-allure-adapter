import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { allureTasks } from './allure';
import { startReporterServer } from './server';
import AutoScreen = Cypress.AutoScreen;

// this runs in node
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const configureEnv = (on: PluginEvents, config: PluginConfigOptions) => {
  // do setup with events and env, register tasks
  // register plugin events
  config.report = true;

  const reporter = allureTasks({
    allureResults: config?.reporterOptions?.allureResults ?? 'allure-results',
    screenshots: config.screenshotsFolder || 'no',
    videos: config.videosFolder,
  });

  startReporterServer(config, reporter);

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
    console.log('AFTER SPEC');
    const scr = (results as any).screenshots as AutoScreen[];
    console.log(scr);
    reporter.attachScreenshots({ screenshots: scr });

    reporter.attachVideoToTests({ path: results.video ?? '' });

    //results.screenshots

    /*reporter.suiteStarted({ fullTitle: 'd', title: 'video' });
    reporter.testStarted({ fullTitle: spec.name, title: spec.name, id: spec.name });
    reporter.video({ path: 'd' });
    reporter.testEnded({ result: 'passed' });
    reporter.suiteEnded({});*/
  });

  // on('task', tasks);
};
