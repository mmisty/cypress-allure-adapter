import Debug from 'debug';
import { AllureReporter } from './allure-reporter-plugin';
import { AllureTaskArgs, AllureTasks, Status } from './allure-types';
import { appendFile, mkdir, writeFile } from 'fs/promises';
import { logWithPackage } from '../common';
import { dirname } from 'path';
import { TaskManager } from './task-manager';
import { ReportingServer } from './reporting-server';

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
  allureSkipSteps: string;
  // to test mocha events in jest
  isTest: boolean;
};

// const copyResultsToWatchFolder = async (allureResults: string, allureResultsWatch: string) => {
//   if (allureResults === allureResultsWatch) {
//     log(`copyResultsToWatchFolder: allureResultsWatch the same as allureResults ${allureResults}, will not copy`);
//
//     return;
//   }
//
//   const results = glob.sync(`${allureResults}/*.*`);
//
//   mkdirSyncWithTry(allureResultsWatch);
//
//   log(`allureResults: ${allureResults}`);
//   log(`allureResultsWatch: ${allureResultsWatch}`);
//
//   const resultCopyTasks = results.map(res => {
//     const to = `${allureResultsWatch}/${basename(res)}`;
//
//     return copyFileCp(res, to, true);
//   });
//
//   await Promise.all(resultCopyTasks)
//     .then(() => {
//       log('All results copied to watch folder');
//     })
//     .catch(err => {
//       log('Some files failed to copy to watch folder:', err);
//     });
// };

export const allureTasks = (opts: ReporterOptions, reportingServer?: ReportingServer): AllureTasks => {
  // todo config
  const taskManager = new TaskManager();
  // Create a default reporting server if not provided (for backward compatibility with tests)
  const server = reportingServer ?? new ReportingServer();
  let allureReporter = new AllureReporter(opts, taskManager, server);
  const allureResults = opts.allureResults;
  // const allureResultsWatch = opts.techAllureResults;

  return {
    taskManager,
    flushFileOperations: () => server.flush(),
    specStarted: (arg: AllureTaskArgs<'specStarted'>) => {
      log(`specStarted: ${JSON.stringify(arg)}`);
      // reset state on spec start
      allureReporter = new AllureReporter(opts, taskManager, server);
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
      allureReporter.endStep({ date: arg.date, status: (arg.status as Status) ?? Status.PASSED, details: arg.details });
      log('step');
    },
    mergeStepMaybe: (arg: AllureTaskArgs<'mergeStepMaybe'>) => {
      log(`mergePrevStep ${JSON.stringify(arg)}`);
      const steps = allureReporter.currentTest?.result.steps ?? [];
      const last = steps[steps?.length - 1];

      if (last && arg.name === last.name) {
        steps.splice(steps?.length - 1, 1);

        allureReporter.startStep({ name: arg.name, date: last.start });

        // Add child steps from the merged step
        if (allureReporter.currentStep) {
          last.steps.forEach((s: { name?: string }) => {
            allureReporter.currentStep!.result.steps.push(s as any);
          });
        }
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

    endAllSteps: (arg: AllureTaskArgs<'endAllSteps'>) => {
      log(`endAllSteps ${JSON.stringify(arg)}`);
      allureReporter.endAllSteps(arg);
      log('endAllSteps');
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
      // Fire and forget
      server.mkdir(allureResults, { recursive: true });

      // Write in old format (key = value) for backwards compatibility
      const content = Object.entries(arg.info)
        .filter(([key, value]) => key && value !== undefined)
        .map(([key, value]) => `${key} = ${value}`)
        .join('\n');
      server.writeFile(`${allureResults}/environment.properties`, content);
    },

    addEnvironmentInfo(arg: AllureTaskArgs<'addEnvironmentInfo'>) {
      // Fire and forget - use addOperation for reads
      // First flush to ensure any previous writes complete before we read
      server.addOperation(async () => {
        await server.flush();

        const additionalInfo = arg.info;
        const existing = await allureReporter.getEnvInfoAsync(allureResults);
        // be careful with parallelization, todo

        // do not override values when it is different from additional
        for (const key in existing) {
          if (additionalInfo[key] && additionalInfo[key] !== existing[key]) {
            additionalInfo[key] += `,${existing[key]}`;
          }
        }
        const newInfo = { ...existing, ...additionalInfo };

        // Write in old format (key = value) for backwards compatibility
        server.mkdir(allureResults, { recursive: true });

        const content = Object.entries(newInfo)
          .filter(([key, value]) => key && value !== undefined)
          .map(([key, value]) => `${key} = ${value}`)
          .join('\n');
        server.writeFile(`${allureResults}/environment.properties`, content);
      });
    },

    writeExecutorInfo(arg: AllureTaskArgs<'writeExecutorInfo'>) {
      // Fire and forget
      server.writeFile(`${allureResults}/executor.json`, JSON.stringify(arg.info));
    },

    writeCategoriesDefinitions(arg: AllureTaskArgs<'writeCategoriesDefinitions'>) {
      // Fire and forget - use addOperation for reads
      server.addOperation(async () => {
        try {
          let contents: string | undefined;

          if (typeof arg.categories !== 'string') {
            contents = JSON.stringify(arg.categories, null, '  ');
          } else {
            const file = arg.categories;
            const exists = await server.exists(file);

            if (!exists) {
              logWithPackage('error', `Categories file doesn't exist '${file}'`);

              return;
            }

            const content = await server.readFile(file);
            contents = content.toString();
          }

          if (contents) {
            server.writeFile(`${allureResults}/categories.json`, contents);
          }
        } catch (err) {
          logWithPackage('error', 'Could not write categories definitions info');
        }
      });
    },

    delete(arg: AllureTaskArgs<'delete'>) {
      // Fire and forget
      if (server.existsSync(arg.path)) {
        server.removeFile(arg.path);
      }
    },

    deleteResults(_arg: AllureTaskArgs<'deleteResults'>) {
      allureReporter = new AllureReporter(opts, taskManager, server);

      // Fire and forget
      if (server.existsSync(allureResults)) {
        server.removeFile(allureResults);
      }
    },

    testResult(arg: AllureTaskArgs<'testResult'>) {
      log(`testResult ${JSON.stringify(arg)}`);

      if (allureReporter.currentTest) {
        allureReporter.endAllSteps({ status: arg.result as Status, details: arg.details });
        allureReporter.currentTest.result.status = arg.result;

        if (arg.details?.message) {
          allureReporter.currentTest.result.statusDetails.message = arg.details.message;
        }

        if (allureReporter.currentTestAll) {
          allureReporter.currentTestAll.mochaId = arg.id;
        }
      }
      log('testResult');
    },

    testEnded: (arg: AllureTaskArgs<'testEnded'>) => {
      log(`testEnded ${JSON.stringify(arg)}`);
      allureReporter.endTest(arg);
      log('testEnded');
    },

    label: (arg: AllureTaskArgs<'label'>) => {
      log(`label ${JSON.stringify(arg)}`);
      allureReporter.label(arg);
      log('label');
    },

    suite: (arg: AllureTaskArgs<'suite'>) => {
      log(`suite ${JSON.stringify(arg)}`);
      allureReporter.suite(arg);
      log('suite');
    },

    subSuite: (arg: AllureTaskArgs<'subSuite'>) => {
      log(`subSuite ${JSON.stringify(arg)}`);
      allureReporter.subSuite(arg);
      log('subSuite');
    },

    parentSuite: (arg: AllureTaskArgs<'parentSuite'>) => {
      log(`parentSuite ${JSON.stringify(arg)}`);
      allureReporter.parentSuite(arg);
      log('parentSuite');
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

    historyId: (arg: AllureTaskArgs<'historyId'>) => {
      log(`historyId ${JSON.stringify(arg)}`);
      allureReporter.historyId(arg);
      log('historyId');
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

    testMessage(arg: AllureTaskArgs<'testMessage'>) {
      log(`testMessage ${JSON.stringify(arg)}`);

      if (!opts.isTest) {
        return;
      }

      // Fire and forget - use addOperation for reads
      server.addOperation(async () => {
        const dirPath = dirname(arg.path);
        const dirExists = await server.exists(dirPath);

        if (!dirExists) {
          await mkdir(dirPath, { recursive: true });
          await writeFile(arg.path, '');
        }
        await appendFile(arg.path, `${arg.message}\n`);
      });
    },

    screenshotOne: (arg: AllureTaskArgs<'screenshotOne'>) => {
      log(`screenshotOne ${JSON.stringify(arg)}`);
      allureReporter.screenshotOne(arg);
      log('screenshotOne');
    },
    screenshotAttachment: (arg: AllureTaskArgs<'screenshotAttachment'>) => {
      log(`screenshotAttachment ${JSON.stringify(arg)}`);
      allureReporter.screenshotAttachment(arg);
      log('screenshotAttachment');
    },

    async afterSpec(arg: AllureTaskArgs<'afterSpec'>) {
      log(`afterSpec ${JSON.stringify(arg)}`);

      if (arg.results && arg.results?.video) {
        const { video } = arg.results ?? {};
        log(`afterSpec video path: ${video}`);

        allureReporter.attachVideoToContainers({ path: video ?? '' });
      } else {
        logWithPackage('error', 'No video path in afterSpec result');
      }

      // attach missing screenshots
      try {
        allureReporter.attachScreenshots(arg.results);
      } catch (err) {
        logWithPackage(
          'error',
          `Could not attach screenshots to spec: ${arg.results.spec.relative}:\n${(err as Error).message}`,
        );
      }

      // this should be done after video processed
      allureReporter.afterSpecMoveToWatch();

      // Flush the reporting server queue and taskManager
      await server.flush();
      await taskManager.flushAllTasksForQueue(arg.results.spec.relative);
      logWithPackage('log', `Finished processing all files for spec ${arg.results?.spec?.relative}`);

      log('afterSpec');
    },

    async waitAllFinished(_arg: AllureTaskArgs<'waitAllFinished'>) {
      await server.flush();
      await taskManager.flushAllTasks();
    },
  };
};
