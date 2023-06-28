import RequestTask = Cypress.RequestTask;
import AllureTaskArgs = Cypress.AllureTaskArgs;
import { readdirSync, readFileSync } from 'fs';
import { basename } from 'path';
import { AllureReporter } from './allure-reporter-plugin';
import { delay } from 'jest-test-each/dist/tests/utils/utils';

const log = (...args: unknown[]) => {
  console.log(`[allure] ${args}`);
};

export type AllureTasks = { [key in RequestTask]: (args: AllureTaskArgs<key>) => null | Promise<null> };

export const allureTasks = (opts?: { allureResults?: string }): AllureTasks => {
  const defaultDir = 'allure-results';
  // todo config
  const { allureResults } = opts ?? {};

  log(`ALLURE RESULTS: ${allureResults}`);

  const allureReporter = new AllureReporter(allureResults ?? defaultDir);
  let logs: any[] | undefined = undefined;

  return {
    specStarted: (args: AllureTaskArgs<'specStarted'>) => {
      log('SPEC started');
      log(args);
      allureReporter.currentSpec = args.spec;
      // should be once ?
      allureReporter.allureRuntime.writer.writeEnvironmentInfo({ evd: 'test env' });

      return null;
    },

    suiteStarted: (arg: AllureTaskArgs<'suiteStarted'>) => {
      allureReporter.startGroup(arg.title);
      log(`SUITE STARTED: ${JSON.stringify(arg)}`);

      return null;
    },

    stepStarted: (arg: AllureTaskArgs<'stepStarted'>) => {
      allureReporter.startStep(arg);
      log(`STEP START: ${JSON.stringify(arg)}`);

      return null;
    },

    step: (arg: AllureTaskArgs<'step'>) => {
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

    suiteEnded: (arg: AllureTaskArgs<'suiteEnded'>) => {
      allureReporter.endGroup();

      log(`SUITE END: ${JSON.stringify(arg)}`);

      return null;
    },

    testStarted: (arg: AllureTaskArgs<'testStarted'>) => {
      logs = undefined;
      log(`TEST START: ${JSON.stringify(arg)}`);
      allureReporter.startTest(arg);

      return null;
    },

    testEnded: async (arg: AllureTaskArgs<'testEnded'>) => {
      while (true) {
        if (!logs || logs.length > 0) {
          log(`LOGS: ${logs?.length}`);
          await delay(100);
        } else {
          break;
        }
      }
      allureReporter.endTest(arg);

      log(`TEST END: ${JSON.stringify(arg)}`);

      return null;
    },
    setLabel: (arg: AllureTaskArgs<'setLabel'>) => {
      log(`SET LABEL: ${JSON.stringify(arg)}`);
      allureReporter.setLabel(arg);

      return null;
    },
    message: (arg: AllureTaskArgs<'message'>) => {
      log(`MESSAGE: ${JSON.stringify(arg)}`);

      return null;
    },
    screenshot: (arg: AllureTaskArgs<'screenshot'>) => {
      log(`SCREENSHOT: ${JSON.stringify(arg)}`);

      // const path = `integration/screenshots/${args.path}`;
      const p = '/Users/tpitko/dev/cypress-allure2-adapter/integration/screenshots/one.cy.ts/';
      const files = readdirSync(p);
      files.forEach(f => {
        const file = p + f;
        console.log(file);
        const exec = allureReporter.currentStep ?? allureReporter.currentTest;

        const fileCot = readFileSync(file);

        // to have it in allure-results directory
        const pathDir = allureReporter.allureRuntime.writeAttachment(fileCot, {
          fileExtension: 'png',
          contentType: 'image/png',
        });
        exec?.addAttachment(basename(file), { contentType: 'image/png', fileExtension: 'png' }, pathDir);
      });

      return null;
    },
    video: (arg: AllureTaskArgs<'video'>) => {
      log(`VIDEO: ${JSON.stringify(arg)}`);
      // const path = `integration/videos/${args.path}`;
      const p = '/Users/tpitko/dev/cypress-allure2-adapter/integration/videos/';
      const files = readdirSync(p);
      files.forEach(f => {
        const file = p + f;
        console.log(file);
        const exec = allureReporter.currentStep ?? allureReporter.currentTest;

        const fileCot = readFileSync(file);

        // to have it in allure-results directory
        const pathDir = allureReporter.allureRuntime.writeAttachment(fileCot, {
          fileExtension: 'mp4',
          contentType: 'video/mp4',
        });
        exec?.addAttachment(basename(file), { contentType: 'video/mp4', fileExtension: 'mp4' }, pathDir);
      });

      return null;
    },

    async allLogs(arg: AllureTaskArgs<'allLogs'>) {
      log(`allLogs: ${JSON.stringify(arg)}`);
      // spec name
      logs = arg.allLogs;

      console.log('allLogs');
      // console.log(logs);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [_i, t] of logs.entries()) {
        const task = t.task as RequestTask;
        await this[task](t.arg);
        // wait cy.now('allure', { task: 'allLogs', arg: { allLogs } });
      }

      await this.screenshot({ path: '' });
      await this.video({ path: '' });
      logs = [];

      return null;
    },
  };
};
