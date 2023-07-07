import Debug from 'debug';
import { AllureReporter } from './allure-reporter-plugin';
import { AllureTaskArgs, AllureTasks, Status } from './allure-types';

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
    },
    hookStarted: (arg: AllureTaskArgs<'hookStarted'>) => {
      log(`hookStart: ${JSON.stringify(arg)}`);
      allureReporter.hookStarted(arg);
      log('hookStarted');
    },
    hookEnded: (arg: AllureTaskArgs<'hookEnded'>) => {
      log(`hookEnd: ${JSON.stringify(arg)}`);
      allureReporter.hookEnded(arg);
      log('hookEnded');
    },

    suiteStarted: (arg: AllureTaskArgs<'suiteStarted'>) => {
      log(`suiteStarted: ${JSON.stringify(arg)}`);
      allureReporter.suiteStarted(arg);
      log('suiteStarted');
    },
    stepStarted: (arg: AllureTaskArgs<'stepStarted'>) => {
      log(`stepStarted ${JSON.stringify(arg)}`);
      allureReporter.startStep(arg);
      log('stepStarted');
    },

    step: (arg: AllureTaskArgs<'step'>) => {
      log(`step ${JSON.stringify(arg)}`);
      allureReporter.startStep(arg);
      allureReporter.endStep({ ...arg, status: (arg.status as Status) ?? Status.PASSED });
      log('step');
    },

    stepEnded: (arg: AllureTaskArgs<'stepEnded'>) => {
      log(`stepEnded ${JSON.stringify(arg)}`);
      allureReporter.endStep(arg);
      log('stepEnded');
    },

    suiteEnded: (arg: AllureTaskArgs<'suiteEnded'>) => {
      log(`suiteEnded ${JSON.stringify(arg)}`);
      allureReporter.endGroup();
      log('suiteEnded');
    },
    globalHook: (arg: AllureTaskArgs<'globalHook'>) => {
      log(`globalHook ${JSON.stringify(arg)}`);
      allureReporter.addGlobalHooks();
      log('globalHook');
    },

    testStarted(arg: AllureTaskArgs<'testStarted'>) {
      log(`testStarted ${JSON.stringify(arg)}`);
      allureReporter.startTest(arg);
      log('testStarted');
    },

    testResult(arg: AllureTaskArgs<'testResult'>) {
      log(`testResult ${JSON.stringify(arg)}`);

      if (allureReporter.currentTest) {
        allureReporter.endAllSteps({ status: arg.result as Status });
        allureReporter.currentTest.status = arg.result as any;
        allureReporter.currentTest.detailsMessage = arg.details?.message as any;
      }
      log('testResult');
    },
    testEnded: async (arg: AllureTaskArgs<'testEnded'>) => {
      log(`testEnded ${JSON.stringify(arg)}`);
      allureReporter.endTest(arg);
      log('testEnded');
    },

    label: (arg: AllureTaskArgs<'label'>) => {
      log(`label ${JSON.stringify(arg)}`);
      allureReporter.label(arg);
      log('label');
    },

    parameter: (arg: AllureTaskArgs<'parameter'>) => {
      log(`parameter ${JSON.stringify(arg)}`);
      allureReporter.parameter(arg);
      log('parameter');
    },
    testStatus: (arg: AllureTaskArgs<'testStatus'>) => {
      log(`testStatus ${JSON.stringify(arg)}`);
      allureReporter.testStatus(arg);
      log('testStatus');
    },
    testDetails: (arg: AllureTaskArgs<'testDetails'>) => {
      log(`testDetails ${JSON.stringify(arg)}`);
      allureReporter.testDetails(arg);
      log('testDetails');
    },
    testAttachment: (arg: AllureTaskArgs<'testAttachment'>) => {
      log(`testAttachment ${JSON.stringify(arg)}`);
      allureReporter.testAttachment(arg);
      log('testAttachment');
    },
    testFileAttachment: (arg: AllureTaskArgs<'testFileAttachment'>) => {
      log(`testFileAttachment ${JSON.stringify(arg)}`);
      allureReporter.testFileAttachment(arg);
      log('testFileAttachment');
    },
    attachment: (arg: AllureTaskArgs<'attachment'>) => {
      log(`attachment ${JSON.stringify(arg)}`);
      allureReporter.attachment(arg);
      log('attachment');
    },
    thread: (arg: AllureTaskArgs<'thread'>) => {
      log(`priority ${JSON.stringify(arg)}`);
      allureReporter.thread(arg);
      log('priority');
    },
    owner: (arg: AllureTaskArgs<'owner'>) => {
      log(`owner ${JSON.stringify(arg)}`);
      allureReporter.owner(arg);
      log('owner');
    },
    fullName: (arg: AllureTaskArgs<'fullName'>) => {
      log(`fullName ${JSON.stringify(arg)}`);
      allureReporter.fullName(arg);
      log('fullName');
    },
    lead: (arg: AllureTaskArgs<'lead'>) => {
      log(`owner ${JSON.stringify(arg)}`);
      allureReporter.lead(arg);
      log('lead');
    },
    host: (arg: AllureTaskArgs<'host'>) => {
      log(`host ${JSON.stringify(arg)}`);
      allureReporter.host(arg);
      log('host');
    },
    language: (arg: AllureTaskArgs<'language'>) => {
      log(`language ${JSON.stringify(arg)}`);
      allureReporter.language(arg);
      log('language');
    },
    link: (arg: AllureTaskArgs<'link'>) => {
      log(`link ${JSON.stringify(arg)}`);
      allureReporter.link(arg);
      log('link');
    },
    epic: (arg: AllureTaskArgs<'epic'>) => {
      log(`epic ${JSON.stringify(arg)}`);
      allureReporter.epic(arg);
      log('epic');
    },
    feature: (arg: AllureTaskArgs<'feature'>) => {
      log(`feature ${JSON.stringify(arg)}`);
      allureReporter.feature(arg);
      log('feature');
    },
    story: (arg: AllureTaskArgs<'story'>) => {
      log(`story ${JSON.stringify(arg)}`);
      allureReporter.story(arg);
      log('story');
    },
    allureId: (arg: AllureTaskArgs<'allureId'>) => {
      log(`allureId ${JSON.stringify(arg)}`);
      allureReporter.allureId(arg);
      log('allureId');
    },
    severity: (arg: AllureTaskArgs<'severity'>) => {
      log(`severity ${JSON.stringify(arg)}`);
      allureReporter.severity(arg);
      log('severity');
    },
    addDescriptionHtml: (arg: AllureTaskArgs<'addDescriptionHtml'>) => {
      log(`addDescriptionHtml ${JSON.stringify(arg)}`);
      allureReporter.addDescriptionHtml(arg);
      log('addDescriptionHtml');
    },

    testParameter: (arg: AllureTaskArgs<'testParameter'>) => {
      log(`testParameter ${JSON.stringify(arg)}`);
      allureReporter.testParameter(arg);
      log('testParameter');
    },

    endAll: () => {
      log('endAll started');
      allureReporter.endAll();
      log('endAll');
    },
    message: (arg: AllureTaskArgs<'message'>) => {
      log(`message ${JSON.stringify(arg)}`);
    },
    screenshotOne: (arg: AllureTaskArgs<'screenshotOne'>) => {
      log(`screenshotOne ${JSON.stringify(arg)}`);
      allureReporter.screenshotOne(arg);
      log('screenshotOne');
    },
    // add all screenshots
    attachScreenshots: (arg: AllureTaskArgs<'attachScreenshots'>) => {
      log(`attachScreenshots ${JSON.stringify(arg)}`);

      // this goes in after:spec
      allureReporter.attachScreenshots(arg);
      log('attachScreenshots');
    },
    attachVideoToTests: (arg: AllureTaskArgs<'attachVideoToTests'>) => {
      log(`attachScreenshots ${JSON.stringify(arg)}`);
      allureReporter.attachVideoToTests(arg);
      log('attachVideoToTests');
    },
  };
};
