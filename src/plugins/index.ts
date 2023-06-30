import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { tasks } from './tasks';
import { allureTasks } from './allure';
import { startReporterServer } from './server';
import process from 'process';

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
  const serv = startReporterServer({} as any, 3000, reporter);

  /*serv.on('close', async () => {
    console.log('Server closings');
    reporter.suiteStarted({ fullTitle: 'd', title: 'video' });
    reporter.testStarted({ fullTitle: 'd1', title: 'video2', id: 'sd' });
    reporter.video({ path: 'd' });
    reporter.testEnded({ result: 'passed' });
    reporter.suiteEnded({});
  });*/

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
    reporter.attachVideoToTests({ path: results.video ?? '' });
    /*reporter.suiteStarted({ fullTitle: 'd', title: 'video' });
    reporter.testStarted({ fullTitle: spec.name, title: spec.name, id: spec.name });
    reporter.video({ path: 'd' });
    reporter.testEnded({ result: 'passed' });
    reporter.suiteEnded({});*/
  });

  on('task', tasks);
};
