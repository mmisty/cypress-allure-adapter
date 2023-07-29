import Debug from 'debug';
import { AllureReporter } from './allure-reporter-plugin';
import { AllureTaskArgs, AllureTasks, Status } from './allure-types';
import { appendFileSync, copyFile, existsSync, mkdirSync, readFile, rm, rmSync, writeFile, writeFileSync } from 'fs';
import { delay, packageLog } from '../common';
import glob, { sync } from 'fast-glob';
import { basename, dirname } from 'path';

const debug = Debug('cypress-allure:proxy');

const log = (...args: unknown[]) => {
  debug(args);
};

export type ReporterOptions = {
  allureAddVideoOnPass: boolean;
  allureResults: string;
  techAllureResults: string;
  videos: string;
  screenshots: string;
  showDuplicateWarn: boolean;
  isTest: boolean;
};

export const allureTasks = (opts: ReporterOptions): AllureTasks => {
  // todo config
  let allureReporter = new AllureReporter(opts);
  const allureResults = opts.allureResults;
  const allureResultsWatch = opts.techAllureResults;

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
    mergeStepMaybe: (arg: AllureTaskArgs<'mergeStepMaybe'>) => {
      log(`mergePrevStep ${JSON.stringify(arg)}`);
      console.log('mergePrevStep');
      console.log(arg);
      const steps = allureReporter.currentTest?.wrappedItem.steps ?? [];
      const last = steps[steps?.length - 1];

      if (arg.name === last.name) {
        steps.splice(steps?.length - 1, 1);

        allureReporter.startStep({ name: arg.name, date: last.start });
        last.steps.forEach(s => {
          allureReporter.currentStep?.addStep(s);
        });
      } else {
        allureReporter.startStep({ name: arg.name, date: Date.now() });
      }

      log('mergePrevStep');
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

    /* globalHook: (arg: AllureTaskArgs<'globalHook'>) => {
      log(`globalHook ${JSON.stringify(arg)}`);
      allureReporter.addGlobalHooks();
      log('globalHook');
    },*/

    testStarted(arg: AllureTaskArgs<'testStarted'>) {
      log(`testStarted ${JSON.stringify(arg)}`);
      allureReporter.startTest(arg);
      log('testStarted');
    },

    writeEnvironmentInfo(arg: AllureTaskArgs<'writeEnvironmentInfo'>) {
      allureReporter.allureRuntime.writer.writeEnvironmentInfo(arg.info);
    },

    writeExecutorInfo(arg: AllureTaskArgs<'writeExecutorInfo'>) {
      try {
        writeFileSync(`${allureResults}/executor.json`, JSON.stringify(arg.info));
      } catch (err) {
        console.error(`${packageLog} Could not write executor info`);
      }
    },

    writeCategoriesDefinitions(arg: AllureTaskArgs<'writeCategoriesDefinitions'>) {
      allureReporter.allureRuntime.writer.writeCategoriesDefinitions(arg.categories);
    },

    delete(arg: AllureTaskArgs<'delete'>) {
      try {
        if (existsSync(arg.path)) {
          rmSync(arg.path, { recursive: true });
        }
      } catch (err) {
        log(`Could not delete: ${(err as Error).message}`);
      }
    },

    deleteResults(_arg: AllureTaskArgs<'deleteResults'>) {
      allureReporter = new AllureReporter(opts);

      try {
        if (existsSync(allureResults)) {
          rmSync(allureResults, { recursive: true });
        }
      } catch (err) {
        log(`Could not delete: ${(err as Error).message}`);
      }
    },

    testResult(arg: AllureTaskArgs<'testResult'>) {
      log(`testResult ${JSON.stringify(arg)}`);

      if (allureReporter.currentTest) {
        allureReporter.endAllSteps({ status: arg.result as Status, details: arg.details });
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
    fileAttachment: (arg: AllureTaskArgs<'fileAttachment'>) => {
      log(`fileAttachment ${JSON.stringify(arg)}`);
      allureReporter.fileAttachment(arg);
      log('fileAttachment');
    },
    attachment: (arg: AllureTaskArgs<'attachment'>) => {
      log(`attachment ${JSON.stringify(arg)}`);
      allureReporter.attachment(arg);
      log('attachment');
    },
    fullName: (arg: AllureTaskArgs<'fullName'>) => {
      log(`fullName ${JSON.stringify(arg)}`);
      allureReporter.fullName(arg);
      log('fullName');
    },
    link: (arg: AllureTaskArgs<'link'>) => {
      log(`link ${JSON.stringify(arg)}`);
      allureReporter.link(arg);
      log('link');
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

    testMessage: (arg: AllureTaskArgs<'testMessage'>) => {
      log(`testMessage ${JSON.stringify(arg)}`);

      if (!opts.isTest) {
        return;
      }

      if (!existsSync(dirname(arg.path))) {
        mkdirSync(dirname(arg.path), { recursive: true });
        writeFileSync(arg.path, '');
      }
      appendFileSync(arg.path, `${arg.message}\n`);
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

    attachVideoToTests: async (arg: AllureTaskArgs<'attachVideoToTests'>) => {
      log(`attachScreenshots ${JSON.stringify(arg)}`);
      await allureReporter.attachVideoToTests(arg);
      log('attachVideoToTests');
    },

    async afterSpec(arg: AllureTaskArgs<'afterSpec'>) {
      log(`afterSpec ${JSON.stringify(arg)}`);
      const { video } = arg.results;
      log(`afterSpec video path: ${video}`);

      if (!video) {
        console.error(`${packageLog} No video path in afterSpec result`);

        return;
      }
      await allureReporter.attachVideoToTests({ path: video ?? '' });

      if (allureResults !== allureResultsWatch) {
        const results = glob.sync(`${allureResults}/*.*`);

        if (!existsSync(allureResultsWatch)) {
          mkdirSync(allureResultsWatch);
        }
        log(`allureResults: ${allureResults}`);
        log(`allureResultsWatch: ${allureResultsWatch}`);
        let doneFiles = 0;
        const started = Date.now();
        const timeout = 10000;

        results.forEach(res => {
          const to = `${allureResultsWatch}/${basename(res)}`;
          log(`copy file ${res} to ${to}`);
          copyFile(res, to, err => {
            if (err) {
              log(err);
            }
            rm(res, () => {
              // ignore
            });
            doneFiles = doneFiles + 1;
          });
        });

        while (doneFiles < results.length) {
          if (Date.now() - started >= timeout) {
            console.error(`${packageLog} Could not write all attachments in ${timeout}ms`);
            break;
          }
          await delay(100);
        }
      }

      log('afterSpec');
    },

    /*flushWatcher: async (_arg: AllureTaskArgs<'flushWatcher'>) => {
      const allFiles = sync(`${allureResults}/*`);
      debug('FLUSH spec');
      let doneFiles = 0;

      for (const fl of allFiles) {
        if (!existsSync(fl)) {
          doneFiles = doneFiles + 1;

          return;
        }

        readFile(fl, (err, content) => {
          if (!err) {
            writeFile(fl, content, errWrite => {
              if (errWrite) {
                debug(`Error writing file: ${errWrite.message}`);
              } else {
                debug('done writing');
                doneFiles++;
              }
            });
          } else {
            debug(`Error reading file: ${err?.message}`);
          }
        });
      }

      const started = Date.now();
      const timeout = 10000;

      while (doneFiles < allFiles.length) {
        if (Date.now() - started >= timeout) {
          console.error(`Could not flush all files in ${timeout}ms`);
          break;
        }
        await delay(100);
      }
    },*/
  };
};
