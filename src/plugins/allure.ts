import Debug from 'debug';
import { AllureReporter } from './allure-reporter-plugin';
import AllureTasks = Cypress.AllureTasks;
import AllureTaskArgs = Cypress.AllureTaskArgs;

const debug = Debug('cypress-allure:proxy');

const log = (...args: unknown[]) => {
  debug(args);
};

export type ReporterOptions = {
  allureResults: string;
  videos: string;
  screenshots: string;
};

export const allureTasks = (opts: ReporterOptions): AllureTasks => {
  // todo config
  let allureReporter = new AllureReporter(opts);

  return {
    specStarted: (arg: AllureTaskArgs<'specStarted'>) => {
      log(`specStarted: ${JSON.stringify(arg)}`);
      // reset state on spec start
      allureReporter = new AllureReporter(opts);
      allureReporter.specStarted(arg);
      log('specStarted');

      return null;
    },
    hookStarted: (arg: AllureTaskArgs<'hookStarted'>) => {
      log(`hookStart: ${JSON.stringify(arg)}`);
      allureReporter.hookStarted(arg);
      log('hookStarted');

      return null;
    },
    hookEnded: (arg: AllureTaskArgs<'hookEnded'>) => {
      log(`hookEnd: ${JSON.stringify(arg)}`);
      allureReporter.hookEnded(arg);
      log('hookEnded');

      return null;
    },

    suiteStarted: (arg: AllureTaskArgs<'suiteStarted'>) => {
      log(`suiteStarted: ${JSON.stringify(arg)}`);
      const { title } = arg;
      allureReporter.startGroup(title);
      log('suiteStarted');

      return null;
    },
    /*currentSpec: (arg: AllureTaskArgs<'currentSpec'>) => {
      allureReporter.currentSpec = arg.spec;

      return null;
    },*/
    stepStarted: (arg: AllureTaskArgs<'stepStarted'>) => {
      log(`stepStarted ${JSON.stringify(arg)}`);
      allureReporter.startStep(arg);
      log('stepStarted');

      return null;
    },

    /*globHook(_args: AllureTaskArgs<'globHook'>) {
      allureReporter.addGlobalHooks();

      return null;
    },*/
    step: (arg: AllureTaskArgs<'step'>) => {
      log(`step ${JSON.stringify(arg)}`);
      allureReporter.startStep(arg);
      allureReporter.endStep({ ...arg, status: arg.status ?? 'passed' });

      log('step');

      return null;
    },

    stepEnded: (arg: AllureTaskArgs<'stepEnded'>) => {
      log(`stepEnded ${JSON.stringify(arg)}`);
      allureReporter.endStep(arg);
      log('stepEnded');

      return null;
    },
    // stepEndedAll: (arg: AllureTaskArgs<'stepEndedAll'>) => {
    //   allureReporter.endAllSteps(arg);
    //
    //   log(`STEP END: ${JSON.stringify(arg)}`);
    //
    //   return null;
    // },

    suiteEnded: (arg: AllureTaskArgs<'suiteEnded'>) => {
      log(`suiteEnded ${JSON.stringify(arg)}`);
      allureReporter.endGroup();
      log('suiteEnded');

      return null;
    },

    testStarted(arg: AllureTaskArgs<'testStarted'>) {
      log(`testStarted ${JSON.stringify(arg)}`);
      allureReporter.startTest(arg);
      log('testStarted');

      return null;
    },

    testResult(arg: AllureTaskArgs<'testResult'>) {
      log(`testResult ${JSON.stringify(arg)}`);

      if (allureReporter.currentTest) {
        allureReporter.endAllSteps({ status: arg.result });
        allureReporter.currentTest.status = arg.result as any;
        allureReporter.currentTest.detailsMessage = arg.details?.message as any;
      }
      log('testResult');

      return null;
    },
    testEnded: async (arg: AllureTaskArgs<'testEnded'>) => {
      log(`testEnded ${JSON.stringify(arg)}`);
      allureReporter.endTest(arg);
      log('testEnded');

      return null;
    },

    setLabel: (arg: AllureTaskArgs<'setLabel'>) => {
      log(`setLabel ${JSON.stringify(arg)}`);
      allureReporter.setLabel(arg);
      log('setLabel');

      return null;
    },
    endAll: () => {
      log('endAll started');
      allureReporter.endAll();
      log('endAll');

      return null;
    },
    message: (arg: AllureTaskArgs<'message'>) => {
      log(`message ${JSON.stringify(arg)}`);

      return null;
    },
    screenshotOne: (arg: AllureTaskArgs<'screenshotOne'>) => {
      log(`screenshotOne ${JSON.stringify(arg)}`);
      allureReporter.screenshotOne(arg);
      log('screenshotOne');

      return null;
    },
    // add all screenshots
    attachScreenshots: (arg: AllureTaskArgs<'attachScreenshots'>) => {
      log(`attachScreenshots ${JSON.stringify(arg)}`);

      // this goes in after:spec
      allureReporter.attachScreenshots(arg);
      log('attachScreenshots');

      return null;
    },
    video: (_arg: AllureTaskArgs<'video'>) => {
      return null;
    },
    attachVideoToTests: (arg: AllureTaskArgs<'attachVideoToTests'>) => {
      log(`attachScreenshots ${JSON.stringify(arg)}`);
      allureReporter.attachVideoToTests(arg.path);
      log('attachVideoToTests');

      return null;
    },
  };
};
