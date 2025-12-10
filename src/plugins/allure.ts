import Debug from 'debug';
import { AllureReporter } from './allure-reporter-plugin';
import { AllureTaskArgs, AllureTasks, Status } from './allure-types';
import { logWithPackage } from '../common';
import { TaskManager } from './task-manager';
import { AllureTaskClient } from './allure-task-client';

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

export const allureTasks = (opts: ReporterOptions, client: AllureTaskClient): AllureTasks => {
  const taskManager = new TaskManager();
  taskManager.setClient(client);

  let allureReporter = new AllureReporter(opts, taskManager, client);
  const allureResults = opts.allureResults;
  const allureResultsWatch = opts.techAllureResults;

  return {
    taskManager,
    specStarted: (arg: AllureTaskArgs<'specStarted'>) => {
      log(`specStarted: ${JSON.stringify(arg)}`);
      // reset state on spec start
      allureReporter = new AllureReporter(opts, taskManager, client);
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
            allureReporter.currentStep!.result.steps.push(s as never);
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

    testStarted(arg: AllureTaskArgs<'testStarted'>) {
      log(`testStarted ${JSON.stringify(arg)}`);
      allureReporter.startTest(arg);
      log('testStarted');
    },

    writeEnvironmentInfo(arg: AllureTaskArgs<'writeEnvironmentInfo'>) {
      log(`writeEnvironmentInfo ${JSON.stringify(arg)}`);
      allureReporter.writeEnvironmentInfo(arg);
      log('writeEnvironmentInfo');
    },

    async addEnvironmentInfo(arg: AllureTaskArgs<'addEnvironmentInfo'>) {
      log(`addEnvironmentInfo ${JSON.stringify(arg)}`);
      allureReporter.addEnvironmentInfo(arg);
      log('addEnvironmentInfo');
    },

    async writeExecutorInfo(arg: AllureTaskArgs<'writeExecutorInfo'>) {
      try {
        await client.writeFile(`${allureResults}/executor.json`, JSON.stringify(arg.info));
      } catch (err) {
        logWithPackage('error', `Could not write executor info ${(err as Error).message}`);
      }
    },

    async writeCategoriesDefinitions(arg: AllureTaskArgs<'writeCategoriesDefinitions'>) {
      try {
        const getCategoriesContent = async (): Promise<string | undefined> => {
          if (typeof arg.categories !== 'string') {
            return JSON.stringify(arg.categories, null, '  ');
          }

          const file = arg.categories;
          const exists = await client.exists(file);

          if (!exists) {
            logWithPackage('error', `Categories file doesn't exist '${file}'`);

            return undefined;
          }

          const content = await client.readFile(file);

          return content.toString();
        };

        const contents = await getCategoriesContent();

        if (!contents) {
          return;
        }

        await client.writeFile(`${allureResults}/categories.json`, contents);
      } catch (err) {
        logWithPackage('error', 'Could not write categories definitions info');
      }
    },

    async delete(arg: AllureTaskArgs<'delete'>) {
      try {
        const exists = await client.exists(arg.path);

        if (exists) {
          await client.removeFile(arg.path);
        }
      } catch (err) {
        log(`Could not delete: ${(err as Error).message}`);
      }
    },

    async deleteResults(_arg: AllureTaskArgs<'deleteResults'>) {
      allureReporter = new AllureReporter(opts, taskManager, client);

      try {
        const exists = await client.exists(allureResults);

        if (exists) {
          await client.removeFile(allureResults);
        }
      } catch (err) {
        log(`Could not delete: ${(err as Error).message}`);
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

    async testMessage(arg: AllureTaskArgs<'testMessage'>) {
      log(`testMessage ${JSON.stringify(arg)}`);

      if (!opts.isTest) {
        return;
      }

      try {
        await client.writeTestMessage(arg.path, arg.message);
      } catch (err) {
        log(`Could not write test message: ${(err as Error).message}`);
      }
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

    afterSpec(arg: AllureTaskArgs<'afterSpec'>) {
      log(`afterSpec ${JSON.stringify(arg)}`);

      // Attach video via server operation
      if (arg.results?.video) {
        const { video } = arg.results;
        log(`afterSpec video path: ${video}`);

        taskManager.addOperation(arg.results.spec.relative, {
          type: 'allure:attachVideo',
          allureResults,
          videoPath: video,
          allureAddVideoOnPass: opts.allureAddVideoOnPass,
        });
      } else {
        logWithPackage('error', 'No video path in afterSpec result');
      }

      // Attach screenshots via server operation
      try {
        const screenshots = allureReporter.getScreenshotsForSpec(arg.results);

        if (screenshots.length > 0) {
          taskManager.addOperation(arg.results.spec.relative, {
            type: 'allure:attachScreenshots',
            allureResults,
            screenshots,
            allTests: allureReporter.getAllTests(),
          });
        }
      } catch (err) {
        logWithPackage(
          'error',
          `Could not attach screenshots to spec: ${arg.results.spec.relative}:\n${(err as Error).message}`,
        );
      }

      // Move to watch folder via server operation
      if (allureResults !== allureResultsWatch) {
        taskManager.addOperation(arg.results.spec.relative, {
          type: 'allure:moveToWatch',
          allureResults,
          allureResultsWatch,
        });
      }

      // Wait for all operations to complete
      taskManager.flushAllTasksForQueue(arg.results.spec.relative).then(() => {
        logWithPackage('log', `Finished processing all files for spec ${arg.results?.spec?.relative}`);
      });

      log('afterSpec');
    },

    async waitAllFinished(_arg: AllureTaskArgs<'waitAllFinished'>) {
      await taskManager.flushAllTasks();
    },
  };
};
