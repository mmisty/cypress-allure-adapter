import RequestTask = Cypress.RequestTask;
import AllureTaskArgs = Cypress.AllureTaskArgs;
import { existsSync, mkdirSync } from 'fs';
import { AllureReporter } from './allure-reporter-plugin';

const log = (...args: unknown[]) => {
  console.log(`[allure] ${args}`);
};

export type ReporterOptions = {
  allureResults: string;
  videos: string;
  screenshots: string;
};

export type AllureTasks = { [key in RequestTask]: (args: AllureTaskArgs<key>) => null | Promise<null> };
export type AllureTransfer<T extends RequestTask> = { task: T; arg: AllureTaskArgs<T> };
// reporter inteface

export const allureTasks = (opts: ReporterOptions): AllureTasks & { logs: any[]; stepsDone: boolean } => {
  // todo config
  const { allureResults, videos, screenshots } = opts;

  log(`ALLURE RESULTS: ${allureResults}`);

  const allureReporter = new AllureReporter(allureResults, videos, screenshots);
  let logsMy: any[] = [];
  const steps: string[] = [];

  return {
    get stepsDone() {
      return steps.length === 0;
    },
    get logs() {
      return logsMy;
    },
    set logs(vals: any[]) {
      logsMy = vals;
    },
    specStarted: (args: AllureTaskArgs<'specStarted'>) => {
      log('SPEC started');
      log(JSON.stringify(args));
      allureReporter.currentSpec = args.spec;

      // should be once ?
      if (!existsSync(allureResults)) {
        mkdirSync(allureResults);
      }
      allureReporter.allureRuntime.writer.writeEnvironmentInfo({ evd: 'test env' });

      return null;
    },
    hookStarted: (arg: AllureTaskArgs<'hookStarted'>) => {
      allureReporter.hookStarted(arg);

      return null;
    },
    hookEnded: (arg: AllureTaskArgs<'hookEnded'>) => {
      allureReporter.hookEnded(arg);

      return null;
    },

    suiteStarted: (arg: AllureTaskArgs<'suiteStarted'>) => {
      const { title } = arg;
      allureReporter.startGroup(title);

      log(`SUITE STARTED: ${JSON.stringify(arg)}`);

      return null;
    },
    currentSpec: (arg: AllureTaskArgs<'currentSpec'>) => {
      allureReporter.currentSpec = arg.spec;

      return null;
    },
    stepStarted: (arg: AllureTaskArgs<'stepStarted'>) => {
      steps.push(arg.name);
      allureReporter.startStep(arg);
      log(`STEP START: ${JSON.stringify(arg)}`);

      return null;
    },

    step: (arg: AllureTaskArgs<'step'>) => {
      steps.push(arg.name);
      allureReporter.startStep(arg);
      allureReporter.endStep({ ...arg, status: arg.status ?? 'passed' });

      log(`STEP: ${JSON.stringify(arg)}`);

      return null;
    },

    stepEnded: (arg: AllureTaskArgs<'stepEnded'>) => {
      allureReporter.endStep(arg);

      log(`STEP END: ${JSON.stringify(arg)}`);

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
      allureReporter.endGroup();

      log(`SUITE END: ${JSON.stringify(arg)}`);

      return null;
    },

    testStarted(arg: AllureTaskArgs<'testStarted'>) {
      log(`TEST START: ${JSON.stringify(arg)}`);
      allureReporter.startTest(arg);

      return null;
    },

    testResult(arg: AllureTaskArgs<'testResult'>) {
      if (allureReporter.currentTest) {
        allureReporter.endAllSteps({ status: arg.result });
        allureReporter.currentTest.status = arg.result as any;
      }

      return null;
    },
    testEnded: async (arg: AllureTaskArgs<'testEnded'>) => {
      allureReporter.endTest(arg);

      log(`TEST END: ${JSON.stringify(arg)}`);

      return null;
    },
    setLabel: (arg: AllureTaskArgs<'setLabel'>) => {
      log(`SET LABEL: ${JSON.stringify(arg)}`);
      allureReporter.setLabel(arg);

      return null;
    },
    endAll: () => {
      allureReporter.endAll();

      return null;
    },
    message: (arg: AllureTaskArgs<'message'>) => {
      log(`MESSAGE: ${JSON.stringify(arg)}`);

      return null;
    },
    screenshotOne: (arg: AllureTaskArgs<'screenshotOne'>) => {
      allureReporter.screenshotOne(arg);

      return null;
    },
    // add all screenshots
    attachScreenshots: (arg: AllureTaskArgs<'attachScreenshots'>) => {
      // this after spec

      allureReporter.attachScreenshots(arg);
      //const { screenshots } = arg;
      //log(`SCREENSHOT: ${JSON.stringify(arg)}`);
      // const cwd = process.cwd();
      // const path = `integration/screenshots/${args.path}`;
      // todo
      // todo Cypress/screenshots
      ///const pattern = `${screenshots}/**/*.png`;
      //const files = glob.sync(pattern);

      //if (files.length === 0) {
      //  log(`NO SCREENSHOTS: ${pattern}`);

      //  return null;
      //}*/

      /*files.forEach(file => {
        console.log(file);
        const executable = allureReporter.currentStep ?? allureReporter.currentTest;
        const attachTo = forStep ? executable : allureReporter.currentTest;

        const fileCot = readFileSync(file);

        // to have it in allure-results directory
        const fileNew = `${getUuid(fileCot.toString())}-attachment.png`;

        if (!existsSync(allureResults)) {
          mkdirSync(allureResults);
        }
        copyFileSync(file, `${allureResults}/${fileNew}`);

        /*const pathDir = allureReporter.allureRuntime.writeAttachment(fileCot, {
          fileExtension: 'png',
          contentType: 'image/png',
        });*/
      //attachTo?.addAttachment(basename(file), { contentType: 'image/png', fileExtension: 'png' }, fileNew);
      //  });

      return null;
    },
    video: (_arg: AllureTaskArgs<'video'>) => {
      /* log(`VIDEO: ${JSON.stringify(arg)}`);
      const cwd = process.cwd();
      // const path = `integration/screenshots/${args.path}`;
      // todo Cypress/videos
      const video = `${cwd}/integration/videos/${allureReporter.currentSpec?.name}.mp4`;

      if (!existsSync(video)) {
        log(`NO VIDEO: ${video}`);

        return null;
      }

      const file = video;
      console.log(file);
      const exec = allureReporter.currentStep ?? allureReporter.currentTest;

      const fileCot = readFileSync(file);

      // to have it in allure-results directory
      const pathDir = allureReporter.allureRuntime.writeAttachment(fileCot, {
        fileExtension: 'mp4',
        contentType: 'video/mp4',
      });
      exec?.addAttachment(basename(file), { contentType: 'video/mp4', fileExtension: 'mp4' }, pathDir);
      */

      return null;
    },

    async eventEnd(_arg: AllureTaskArgs<'eventEnd'>) {
      steps.splice(0, -1);

      return null;
    },
    /*async allLogs(arg: AllureTaskArgs<'allLogs'>) {
      log(`allLogs: ${JSON.stringify(arg)}`);
      // spec name

      console.log('allLogs');
      // console.log(logs);
      const lg = arg.allLogs;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [_i, t] of lg.entries()) {
        const task = t.task as RequestTask;
        await this[task](t.arg);
        // wait cy.now('allure', { task: 'allLogs', arg: { allLogs } });
      }
      await this.screenshot({ path: arg.spec.name });
      // await this.video({ path: arg.spec.name });
      logsMy = arg.allLogs;

      return null;
    },*/
    attachVideoToTests: (arg: AllureTaskArgs<'attachVideoToTests'>) => {
      allureReporter.attachVideoToTests(arg.path);

      return null;
    },
  };
};
