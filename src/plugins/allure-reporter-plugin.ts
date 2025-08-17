import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  Attachment,
  ExecutableItem,
  ExecutableItemWrapper,
  FixtureResult,
  Status,
  StatusDetails,
  TestResult,
} from 'allure-js-commons';
import getUuid from 'uuid-by-string';
import { parseAllure } from 'allure-js-parser';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rm, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path, { basename, dirname } from 'path';
import glob from 'fast-glob';
import { ReporterOptions } from './allure';
import Debug from 'debug';
import { GlobalHooks } from './allure-global-hook';
import {
  AfterSpecScreenshots,
  AllureTaskArgs,
  AutoScreen,
  EnvironmentInfo,
  LabelName,
  Stage,
  StatusType,
  UNKNOWN,
} from './allure-types';
import { extname, logWithPackage } from '../common';
import type { ContentType } from '../common/types';
import { randomUUID } from 'crypto';
import { copyAttachments, copyFileCp, copyTest, mkdirSyncWithTry, writeResultFile } from './fs-tools';
import { mergeStepsWithSingleChild, removeFirstStepWhenSame, wrapHooks } from './helper';
import { TaskManager } from './task-manager';

const beforeEachHookName = '"before each" hook';
const beforeAllHookName = '"before all" hook';
const afterEachHookName = '"after each" hook';

const isBeforeEachHook = (ttl: string | undefined) => ttl?.indexOf(beforeEachHookName) !== -1;
const isAfterEachHook = (ttl: string | undefined) => ttl?.indexOf(afterEachHookName) !== -1;
const isBeforeAllHook = (ttl: string | undefined) => ttl?.indexOf(beforeAllHookName) !== -1;

const log = Debug('cypress-allure:reporter');

const createNewContentForContainer = (nameAttAhc: string, existingContents: Buffer, ext: string, specname: string) => {
  const getContentJson = () => {
    try {
      return JSON.parse(existingContents.toString());
    } catch (e) {
      logWithPackage('error', `Could not parse the contents of attachment ${nameAttAhc}`);

      return {};
    }
  };

  const containerJSON = getContentJson();

  const after: ExecutableItem = {
    name: 'video',
    attachments: [
      {
        name: `${specname}${ext}`,
        type: 'video/mp4',
        source: nameAttAhc,
      },
    ],
    parameters: [],
    start: Date.now(),
    stop: Date.now(),
    status: Status.PASSED,
    statusDetails: {},
    stage: Stage.FINISHED,
    steps: [],
  };

  if (!containerJSON.afters) {
    containerJSON.afters = [];
  }

  containerJSON.afters.push(after);

  return containerJSON;
};

/**
 * Will copy test results and all attachments to watch folder
 * for results to appear in TestOps
 * @param input
 * @param allureResultsWatch
 */
// const copyFileToWatch = async (
//   input: { test: string; attachments: { name: string; type: string; source: string }[] },
//   allureResultsWatch: string,
// ) => {
//   const { test: allureResultFile, attachments } = input;
//   const allureResults = path.dirname(allureResultFile);
//
//   if (allureResults === allureResultsWatch) {
//     log(`copyFileToWatch allureResultsWatch the same as allureResults ${allureResults}, will not copy`);
//
//     return;
//   }
//   mkdirSyncWithTry(allureResultsWatch);
//
//   log(`allureResults: ${allureResults}`);
//   log(`allureResultsWatch: ${allureResultsWatch}`);
//   log(`attachments: ${JSON.stringify(attachments)}`);
//
//   await copyAttachments(attachments, allureResultsWatch, allureResultFile);
//   await copyTest(allureResultFile, allureResultsWatch);
// };

/**
 * Get all attachments for test to move them to watch folder
 * @param item test item
 */
const getAllAttachments = (item: ExecutableItem): Attachment[] => {
  const attachmentsResult: Attachment[] = [];

  const inner = (steps: ExecutableItem[], accumulatedRes: Attachment[]): Attachment[] => {
    if (steps.length === 0) {
      return accumulatedRes;
    }

    const [first, ...rest] = steps;
    const newRes = [...accumulatedRes, ...first.attachments];

    return inner(rest, newRes);
  };

  const stepAttachments = inner(item.steps, attachmentsResult);

  return [...stepAttachments, ...item.attachments];
};

// all tests for session
const allTests: {
  specRelative: string | undefined;
  fullTitle: string;
  uuid: string;
  mochaId: string;
  retryIndex: number | undefined;
  status?: Status;
}[] = [];

export class AllureReporter {
  // todo config
  private showDuplicateWarn: boolean;
  private allureResults: string;
  private allureResultsWatch: string;
  private allureAddVideoOnPass: boolean;
  private allureSkipSteps: RegExp[];
  private videos: string;
  private screenshots: string;
  groups: AllureGroup[] = [];
  tests: AllureTest[] = [];
  steps: AllureStep[] = [];
  labels: { name: string; value: string }[] = [];
  globalHooks = new GlobalHooks(this);

  // this is variable for global hooks only
  hooks: { id?: string; hook: ExecutableItemWrapper; nested: number; name: string }[] = [];
  allHooks: { id?: string; hook: ExecutableItemWrapper; suite: string; nested: number; name: string }[] = [];

  currentSpec: Cypress.Spec | undefined;
  allureRuntime: AllureRuntime;
  descriptionHtml: string[] = [];

  private screenshotsTest: (AutoScreen & { attached?: boolean })[] = [];

  testStatusStored: AllureTaskArgs<'testStatus'> | undefined;
  testDetailsStored: AllureTaskArgs<'testDetails'> | undefined;

  constructor(
    opts: ReporterOptions,
    private taskManager: TaskManager,
  ) {
    this.showDuplicateWarn = opts.showDuplicateWarn;
    this.allureResults = opts.allureResults;
    this.allureResultsWatch = opts.techAllureResults;
    this.allureAddVideoOnPass = opts.allureAddVideoOnPass;
    this.videos = opts.videos;
    this.screenshots = opts.screenshots;
    this.allureSkipSteps =
      opts.allureSkipSteps?.split(',').map(x => new RegExp(`^${x.replace(/\./g, '.').replace(/\*/g, '.*')}$`)) ?? [];

    log('Created reporter');
    log(opts);
    this.allureRuntime = new AllureRuntime({ resultsDir: this.allureResults });
  }

  get currentTestAll() {
    if (this.currentTest && allTests[allTests.length - 1]) {
      return allTests[allTests.length - 1];
    }

    return undefined;
  }

  get currentGroup() {
    if (this.groups.length === 0) {
      return undefined;
    }

    return this.groups[this.groups.length - 1];
  }

  get currentTest(): AllureTest | undefined {
    if (this.tests.length === 0) {
      log('No current test!');

      return undefined;
    }

    log('current test');

    return this.tests[this.tests.length - 1];
  }

  get currentHook() {
    if (this.hooks.length === 0) {
      return undefined;
    }

    log('current hook');

    return this.hooks[this.hooks.length - 1].hook;
  }

  get currentStep() {
    if (this.steps.length === 0) {
      return undefined;
    }
    log('current step');

    return this.steps[this.steps.length - 1];
  }

  get currentExecutable() {
    return this.currentStep || this.currentHook || this.currentTest;
  }

  addGlobalHooks(_nestedLevel: number) {
    log('>>> add Global Hooks');

    if (!this.globalHooks.hasHooks()) {
      log('not root hooks');

      return;
    }

    log('add root hooks');
    this.globalHooks.process();
  }

  suiteStarted(arg: AllureTaskArgs<'suiteStarted'>) {
    const { title } = arg;
    log(`start group: ${title}`);

    const group = (this.currentGroup ?? this.allureRuntime).startGroup(title);
    this.groups.push(group);
    log(`SUITES: ${JSON.stringify(this.groups.map(t => t.name))}`);

    this.addGlobalHooks(this.groups.length);
    this.addHooks(this.groups.length);
  }

  addHooks(nested: number) {
    const hooks = this.allHooks.filter(t => t.nested <= nested - 1);

    if (!!this.currentGroup && hooks.length > 0) {
      hooks.forEach(hk => {
        const currentHook = isBeforeAllHook(hk.hook.name)
          ? this.currentGroup!.addBefore()
          : this.currentGroup!.addAfter();

        currentHook.name = hk.name;
        currentHook.wrappedItem.status = hk.hook.status;
        currentHook.wrappedItem.stop = hk.hook.wrappedItem.stop;
        currentHook.wrappedItem.start = hk.hook.wrappedItem.start;
        currentHook.wrappedItem.attachments = hk.hook.wrappedItem.attachments;
        currentHook.wrappedItem.statusDetails = hk.hook.wrappedItem.statusDetails;
        currentHook.wrappedItem.parameters = hk.hook.wrappedItem.parameters;
      });
    }
  }

  specStarted(args: AllureTaskArgs<'specStarted'>) {
    log('SPEC started');
    log(JSON.stringify(args));
    this.currentSpec = args.spec;

    if (!existsSync(this.allureResults)) {
      mkdirSync(this.allureResults, { recursive: true });
    }
  }

  hookStarted(arg: AllureTaskArgs<'hookStarted'>) {
    const { title, hookId, date } = arg ?? {};

    if (!this.currentGroup) {
      log(`no current group - start added hook to storage: ${JSON.stringify(arg)}`);
      this.globalHooks.start(title, hookId);

      return;
    }

    if (!title) {
      return;
    }

    // when before each or after each we create just step inside current test
    if (this.currentTest && (isBeforeEachHook(title) || isAfterEachHook(title))) {
      log(`${title} will not be added to suite:${hookId} ${title}`);
      // need to end all steps before logging hook - it should be logged as parent
      this.endAllSteps({ status: UNKNOWN });

      this.startStep({ name: title });

      return;
    }

    if (this.allureSkipSteps.every(t => !t.test(title))) {
      const currentHook = isBeforeAllHook(title) ? this.currentGroup.addBefore() : this.currentGroup.addAfter();

      currentHook.name = title;
      currentHook.wrappedItem.start = date ?? Date.now();
      this.hooks.push({ id: hookId, hook: currentHook, nested: this.groups.length, name: title });
      this.allHooks.push({
        id: hookId,
        hook: currentHook,
        suite: this.currentGroup?.uuid,
        nested: this.groups.length,
        name: title,
      });
    } else {
      // create but not add to suite for steps to be added there
      const currentHook = new ExecutableItemWrapper({
        name: title,
        uuid: '',
        historyId: '',
        links: [],
        attachments: [],
        parameters: [],
        labels: [],
        steps: [],
        statusDetails: { message: '', trace: '' },
        stage: Stage.FINISHED,
      });

      currentHook.wrappedItem.start = date ?? Date.now();
      this.hooks.push({ id: hookId, hook: currentHook, nested: this.groups.length, name: title });
      this.allHooks.push({
        id: hookId,
        hook: currentHook,
        suite: this.currentGroup?.uuid,
        nested: this.groups.length,
        name: title,
      });
    }
  }

  setExecutableStatus(executable: ExecutableItemWrapper | undefined, res: Status, dtls?: StatusDetails) {
    if (!executable) {
      return;
    }

    if (res === Status.PASSED) {
      executable.status = Status.PASSED;
      executable.stage = Stage.FINISHED;
    }

    if (res === Status.BROKEN) {
      executable.status = Status.BROKEN;
      executable.stage = Stage.FINISHED;
    }

    if (res === Status.FAILED) {
      executable.status = Status.FAILED;
      executable.stage = Stage.FINISHED;

      executable.detailsMessage = dtls?.message;
      executable.detailsTrace = dtls?.trace;
    }

    if (res === Status.SKIPPED) {
      executable.status = Status.SKIPPED;
      executable.stage = Stage.PENDING;

      executable.detailsMessage = dtls?.message || 'Suite disabled';
    }

    if (res !== Status.FAILED && res !== Status.BROKEN && res !== Status.PASSED && res !== Status.SKIPPED) {
      executable.status = UNKNOWN;
      executable.stage = Stage.PENDING;

      executable.detailsMessage = dtls?.message || `Result: ${res ?? '<no>'}`;
    }

    if (dtls) {
      executable.statusDetails = dtls;
    }
  }

  setExecutableItemStatus(executableItem: ExecutableItem | undefined, res: Status, dtls?: StatusDetails) {
    if (!executableItem) {
      return;
    }

    executableItem.status = res;

    if (res === Status.FAILED) {
      if (dtls) {
        executableItem.statusDetails.message = dtls?.message;
        executableItem.statusDetails.trace = dtls?.trace;
      }
    }

    if (res === Status.SKIPPED) {
      executableItem.statusDetails.message = dtls?.message;
    }

    // unknown
    if (res !== Status.FAILED && res !== Status.BROKEN && res !== Status.PASSED && res !== Status.SKIPPED) {
      executableItem.statusDetails.message = dtls?.message;
    }
  }

  hookEnded(arg: AllureTaskArgs<'hookEnded'>) {
    const { title, date, result, details } = arg ?? {};

    if (!this.currentGroup) {
      log('no current group - will end hook in storage');
      this.globalHooks.end(result, details);

      return;
    }

    if (isBeforeEachHook(title) || isAfterEachHook(title)) {
      this.endStep({ status: this.currentStep?.isAnyStepFailed ? Status.FAILED : Status.PASSED });
      this.endAllSteps({ status: UNKNOWN });

      return;
    }

    if (this.currentHook) {
      this.filterSteps(this.currentHook.wrappedItem, this.allureSkipSteps);
      this.currentHook.wrappedItem.stop = date ?? Date.now();
      this.setExecutableStatus(this.currentHook, result, details);
      mergeStepsWithSingleChild(this.currentHook.wrappedItem.steps);

      this.hooks.pop();

      return;
    }
  }

  endHooks(status: StatusType = Status.PASSED) {
    this.hooks.forEach(h => {
      this.hookEnded({ title: h.hook.name, result: status });
    });
  }

  // after spec attach
  attachScreenshots(arg: AfterSpecScreenshots) {
    // attach auto screenshots for fails
    const { screenshots } = arg;
    log('attachScreenshots:');

    if (!screenshots) {
      return;
    }

    log('screenshotsTest:');
    log(JSON.stringify(this.screenshotsTest));
    log('screenshots arg:');
    log(JSON.stringify(screenshots));

    const arr = [...screenshots, ...this.screenshotsTest.filter(x => !x.attached)];

    const uniqueScreenshotsArr = arr.reduce(
      (acc: { map: Map<string, boolean>; list: AutoScreen[] }, current) => {
        const key = `${current.path}`;

        if (!acc.map.has(key)) {
          acc.map.set(key, true);
          current.specName = basename(dirname(current.path));
          acc.list.push(current);
        } else {
          const existing = acc.list.find(t => t.path === current.path);
          const merged = { ...existing, ...current };
          acc.list = acc.list.map(item => (item.path === current.path ? merged : item));
        }

        return acc;
      },
      { map: new Map(), list: [] },
    ).list;

    for (const afterSpecRes of uniqueScreenshotsArr) {
      log(`attachScreenshots: ${afterSpecRes.path}`);

      const getUuiToAdd = () => {
        return allTests.filter(
          t =>
            t.status !== Status.PASSED &&
            t.retryIndex === afterSpecRes.testAttemptIndex &&
            basename(t.specRelative ?? '') === afterSpecRes.specName &&
            (afterSpecRes.testId ? t.mochaId === afterSpecRes.testId : true),
        );
      };

      const uuids = getUuiToAdd().map(t => t.uuid);

      if (uuids.length === 0) {
        log('no attach auto screens, only for non-success tests tests');

        return;
      }

      if (afterSpecRes.testAttemptIndex && afterSpecRes.testId && !uuids[afterSpecRes.testAttemptIndex ?? 0]) {
        log(`no attach, current attempt ${afterSpecRes.testAttemptIndex}`);

        // test passed or no
        return;
      }

      for (const uuid of uuids) {
        const testFile = `${this.allureResults}/${uuid}-result.json`;

        this.taskManager.addTask(() => {
          try {
            const contents = readFileSync(testFile);
            const ext = path.extname(afterSpecRes.path);
            const name = path.basename(afterSpecRes.path);

            type ParsedAttachment = { name: string; type: ContentType; source: string };
            const testCon: { attachments: ParsedAttachment[] } = JSON.parse(contents.toString());
            const uuidNew = randomUUID();
            const nameAttach = `${uuidNew}-attachment${ext}`; // todo not copy same image
            const newPath = path.join(this.allureResults, nameAttach);

            if (!existsSync(newPath)) {
              copyFileSync(afterSpecRes.path, path.join(this.allureResults, nameAttach));
            }

            if (!testCon.attachments) {
              testCon.attachments = [];
            }

            testCon.attachments.push({
              name: name,
              type: 'image/png',
              source: nameAttach, // todo
            });

            writeFileSync(testFile, JSON.stringify(testCon));
          } catch (e) {
            logWithPackage('error', `Could not attach screenshot ${afterSpecRes.screenshotId ?? afterSpecRes.path}`);
          }

          return Promise.resolve();
        });
      }
    }
  }

  keyWhenNoTest(testId: string | undefined) {
    return testId ?? 'NoTestId';
  }

  screenshotAttachment(arg: AllureTaskArgs<'screenshotAttachment'>) {
    const { testId, path, testAttemptIndex, specName, testFailure } = arg;

    this.screenshotsTest.push({ testId, path, testAttemptIndex, specName, testFailure });
  }

  screenshotOne(arg: AllureTaskArgs<'screenshotOne'>) {
    const { name, forStep } = arg;

    if (!name) {
      log('No name specified for screenshot, will not attach');

      return;
    }
    const pattern = `${this.screenshots}/**/${name}*.png`;
    const files = glob.sync(pattern);

    if (files.length === 0) {
      log(`NO SCREENSHOTS: ${pattern}`);

      return;
    }

    files.forEach(file => {
      const executable = this.currentExecutable;
      const attachTo = forStep && this.currentStep ? this.currentStep : executable;
      // to have it in allure-results directory

      const newUuid = randomUUID();
      const fileNew = `${newUuid}-attachment.png`;

      if (!existsSync(this.allureResults)) {
        mkdirSync(this.allureResults, { recursive: true });
      }

      if (!existsSync(file)) {
        logWithPackage('log', `file ${file} doesnt exist`);

        return;
      }
      copyFileSync(file, `${this.allureResults}/${fileNew}`);

      attachTo?.addAttachment(basename(file), { contentType: 'image/png', fileExtension: 'png' }, fileNew);
    });
  }

  /**
   * this is for test ops watch mode - if we put it before file is ready it will not be updated in testops
   */
  afterSpecMoveToWatch() {
    const envProperties = `${this.allureResults}/environment.properties`;
    const executor = `${this.allureResults}/executor.json`;
    const categories = `${this.allureResults}/categories.json`;

    this.taskManager.addTask(async () => {
      if (!existsSync(this.allureResultsWatch)) {
        mkdirSync(this.allureResultsWatch);
      }
      await copyFileCp(envProperties, envProperties.replace(this.allureResults, this.allureResultsWatch), true);
      await copyFileCp(executor, executor.replace(this.allureResults, this.allureResultsWatch), true);
      await copyFileCp(categories, categories.replace(this.allureResults, this.allureResultsWatch), true);
    });

    const tests = parseAllure(this.allureResults);

    const allAttachments = glob.sync(`${this.allureResults}/*-attachment.*`);

    for (const test of tests) {
      this.taskManager.addTask(async () => {
        const testSource = `${this.allureResults}/${test.uuid}-result.json`;
        const testTarget = testSource.replace(this.allureResults, this.allureResultsWatch);

        function getAllParentUuids(test: any) {
          const uuids: string[] = [];
          let current = test.parent;

          while (current) {
            if (current.uuid) {
              uuids.push(current.uuid);
            }
            current = current.parent;
          }

          return uuids;
        }

        const containerSources = getAllParentUuids(test).map(uuid => `${this.allureResults}/${uuid}-container.json`);

        // move attachments referenced in tests or containers
        const testAttachments = allAttachments.filter(attachFile => {
          const testContents = readFileSync(testSource);

          return (
            testContents.indexOf(basename(attachFile)) !== -1 ||
            containerSources
              .filter(x => existsSync(x))
              .some(x => {
                const content = readFileSync(x);

                return content.indexOf(basename(attachFile)) !== -1;
              })
          );
        });

        for (const attachFile of testAttachments) {
          const attachTarget = attachFile.replace(this.allureResults, this.allureResultsWatch);

          if (existsSync(attachFile) && !existsSync(attachTarget)) {
            await copyFileCp(attachFile, attachTarget, true);
          } else {
            if (existsSync(attachFile) && attachFile !== attachTarget) {
              await new Promise(res => {
                rm(attachFile, err => {
                  if (err) {
                    logWithPackage('error', `Could not remove file ${attachFile}: ${err.message}`);
                  }
                  res('removed');
                });
              });
            }
          }
        }

        // copy test results and containers
        if (existsSync(testSource)) {
          // should overwrite
          await copyFileCp(testSource, testTarget, true);
        } else {
          if (existsSync(testSource) && testSource !== testTarget) {
            await new Promise(res => {
              rm(testSource, err => {
                if (err) {
                  logWithPackage('error', `Could not remove file ${testSource}: ${err.message}`);
                }
                res('removed');
              });
            });
          }
        }

        for (const containerSource of containerSources) {
          const containerTarget = containerSource.replace(this.allureResults, this.allureResultsWatch);

          if (containerSource && existsSync(containerSource)) {
            await copyFileCp(containerSource, containerTarget, true);
          } else {
            if (containerSource && existsSync(containerSource) && containerSource !== containerSource) {
              await new Promise(res => {
                rm(containerSource, err => {
                  if (err) {
                    logWithPackage('error', `Could not remove file ${containerSource}: ${err.message}`);
                  }
                  res('removed');
                });
              });
            }
          }
        }
      });
    }
  }

  async waitAllTasksToFinish() {
    await this.taskManager.flushAllTasks();
    log('All files / video copying tasks finished!');
  }

  /**
   * Attach video to parent suite
   * @param arg {path: string}
   */
  attachVideoToContainers(arg: { path: string }) {
    // this happens after test and suites have already finished
    const { path: videoPath } = arg;
    log(`attachVideoToTests: ${videoPath}`);
    const ext = '.mp4';
    const specname = basename(videoPath, ext);
    log(specname);

    // when video uploads everything is uploaded already (TestOps) except containers
    const res = parseAllure(this.allureResults);

    const tests = res
      .filter(t => (this.allureAddVideoOnPass ? true : t.status !== 'passed' && t.status !== 'skipped'))
      .map(t => ({
        path: t.labels.find((l: any) => l.name === 'path')?.value,
        id: t.uuid,
        fullName: t.fullName,
        parent: t.parent,
      }));

    const testsAttach = tests.filter(t => t.path && t.path.indexOf(specname) !== -1);

    const testsWithSameParent = Array.from(
      new Map(
        testsAttach
          .filter(test => test.parent) // keep only ones with parent
          .map(test => [test.parent?.uuid, test]), // key by parent.uuid
      ).values(),
    );

    try {
      readFileSync(videoPath);
    } catch (errVideo) {
      logWithPackage('error', `Could not read video: ${errVideo}`);

      return;
    }

    for (const test of testsWithSameParent) {
      if (!test.parent) {
        logWithPackage('error', `not writing videos since test has no parent suite: ${test.fullName}`);

        return Promise.resolve();
      }

      const containerFile = `${this.allureResults}/${test.parent.uuid}-container.json`;
      log(`ATTACHING to container: ${containerFile}`);

      this.taskManager.addTask(async () => {
        await readFile(containerFile)
          .then(contents => {
            const uuid = randomUUID();
            const nameAttAhc = `${uuid}-attachment${ext}`;
            const newPath = path.join(this.allureResults, nameAttAhc);
            const newContentJson = createNewContentForContainer(nameAttAhc, contents, ext, specname);
            const newContent = JSON.stringify(newContentJson);

            const writeContainer = () => {
              log(`write result file ${containerFile} `);

              return writeResultFile(containerFile, newContent);
            };

            if (existsSync(newPath)) {
              log(`not writing video, file already exists in path ${newPath} `);

              return writeContainer();
            }

            return copyFileCp(videoPath, newPath, false).then(writeContainer);
          })
          .catch(err => {
            log(`error reading container: ${err.message}`);
          });
      });
    }
  }

  endGroup() {
    this.addGlobalHooks(this.groups.length);

    if (this.currentGroup) {
      log('END GROUP');
      this.currentGroup?.endGroup();
      this.groups.pop();
    }
  }

  endAllGroups() {
    log('endAllGroups');
    this.groups.forEach(g => {
      g.endGroup();
    });
    this.allHooks = [];
  }

  label(arg: AllureTaskArgs<'label'>) {
    if (this.currentTest) {
      this.currentTest.addLabel(arg.name, arg.value);
    }
  }

  link(arg: AllureTaskArgs<'link'>) {
    if (this.currentTest) {
      this.currentTest.addLink(arg.url, arg.name, arg.type);
    }
  }

  fullName(arg: AllureTaskArgs<'fullName'>) {
    if (this.currentTest) {
      this.currentTest.fullName = arg.value;
      // should update history id when updating title
      this.currentTest.historyId = getUuid(arg.value);
    }
  }

  historyId(arg: AllureTaskArgs<'fullName'>) {
    if (this.currentTest) {
      this.currentTest.historyId = arg.value;
    }
  }

  parameter(arg: AllureTaskArgs<'parameter'>) {
    if (this.currentExecutable) {
      this.currentExecutable.addParameter(arg.name, arg.value);
    }
  }

  private addGroupLabelByUser(label: string, value?: string) {
    if (value === undefined) {
      // remove suite labels
      this.labels = this.labels.filter(t => t.name !== label);
    } else {
      this.labels.push({ name: label, value: value });
    }
  }

  suite(arg: AllureTaskArgs<'suite'>) {
    if (!this.currentTest) {
      return;
    }
    this.addGroupLabelByUser(LabelName.SUITE, arg.name);
  }

  parentSuite(arg: AllureTaskArgs<'parentSuite'>) {
    if (!this.currentTest) {
      return;
    }

    this.addGroupLabelByUser(LabelName.PARENT_SUITE, arg.name);
  }

  subSuite(arg: AllureTaskArgs<'subSuite'>) {
    if (!this.currentTest) {
      return;
    }
    this.addGroupLabelByUser(LabelName.SUB_SUITE, arg.name);
  }

  testParameter(arg: AllureTaskArgs<'parameter'>) {
    if (this.currentTest) {
      this.currentTest.addParameter(arg.name, arg.value);
    }
  }

  testFileAttachment(arg: AllureTaskArgs<'testFileAttachment'>) {
    this.executableFileAttachment(this.currentTest, arg);
  }

  fileAttachment(arg: AllureTaskArgs<'fileAttachment'>) {
    this.executableFileAttachment(this.currentExecutable, arg);
  }

  testAttachment(arg: AllureTaskArgs<'testAttachment'>) {
    this.executableAttachment(this.currentTest, arg);
  }

  attachment(arg: AllureTaskArgs<'attachment'>) {
    this.executableAttachment(this.currentExecutable, arg);
  }

  addGroupLabels() {
    const [parentSuite, suite, subSuite] = this.groups;

    if (this.currentSpec) {
      const paths = this.currentSpec.relative?.split('/');
      this.currentTest?.addLabel(LabelName.PACKAGE, paths.join('.'));
    }

    if (this.groups.length > 0) {
      this.labels.push({ name: LabelName.PARENT_SUITE, value: parentSuite.name });
    }

    if (this.groups.length > 1) {
      this.labels.push({ name: LabelName.SUITE, value: suite.name });
    }

    if (this.groups.length > 2) {
      this.labels.push({ name: LabelName.SUB_SUITE, value: subSuite.name });
    }
  }

  startTest(arg: AllureTaskArgs<'testStarted'>) {
    const { title, fullTitle, id, currentRetry } = arg;

    if (this.currentTest) {
      // temp fix of defect with wrong event sequence
      log(`will not start already started test: ${fullTitle}`);

      return;
    }
    const duplicates = allTests.filter(t => t.fullTitle === fullTitle);

    const warn =
      'Starting test with the same fullName as already exist, will be shown as ' +
      `retried: ${fullTitle}\nTo solve this rename the test. Spec ${this.currentSpec?.relative}, ` +
      `test full title:  ${fullTitle}`;

    if (duplicates.length > 0 && currentRetry === 0 && this.showDuplicateWarn) {
      logWithPackage('warn', warn);
    }

    if (!this.currentGroup) {
      // fallback
      this.suiteStarted({ title: 'Root suite', fullTitle: 'Root suite' });
    }

    const group = this.currentGroup;
    const test = group!.startTest(title);

    allTests.push({
      retryIndex: currentRetry,
      specRelative: this.currentSpec?.relative,
      fullTitle,
      mochaId: id,
      uuid: test.uuid,
    });
    this.tests.push(test);

    test.fullName = fullTitle;

    test.historyId = getUuid(fullTitle);
    this.addGroupLabels();

    if (this.currentSpec?.relative) {
      test.addLabel('path', this.currentSpec.relative);
    }
    this.globalHooks.processForTest();
  }

  endTests() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _tst of this.tests) {
      this.endTest({ result: UNKNOWN, details: undefined });
    }
  }

  endGroups() {
    this.endTests();
    this.groups.forEach(() => {
      this.endGroup();
    });
  }

  endAll() {
    this.endAllSteps({ status: UNKNOWN, details: undefined });
    this.endHooks(Status.BROKEN);
    this.endGroups();
  }

  addDescriptionHtml(arg: AllureTaskArgs<'addDescriptionHtml'>) {
    this.descriptionHtml.push(arg.value);
    this.applyDescriptionHtml();
  }

  applyDescriptionHtml() {
    if (this.currentTest) {
      this.currentTest.descriptionHtml = this.descriptionHtml.join('');
    }
  }

  testStatus(arg: AllureTaskArgs<'testStatus'>) {
    if (!this.currentTest) {
      return;
    }
    this.testStatusStored = arg;
  }

  testDetails(arg: AllureTaskArgs<'testDetails'>) {
    if (!this.currentTest) {
      return;
    }
    this.testDetailsStored = arg;
  }

  applyGroupLabels() {
    // apply labels

    const applyLabel = (name: string) => {
      if (!this.currentTest) {
        return;
      }
      const lb = this.labels.filter(l => l.name == name);

      // return last added
      const lastLabel = lb[lb.length - 1];

      if (lastLabel) {
        this.currentTest.addLabel(lastLabel.name, lastLabel.value);
      }
    };

    applyLabel(LabelName.PARENT_SUITE);
    applyLabel(LabelName.SUITE);
    applyLabel(LabelName.SUB_SUITE);
  }

  filterSteps(result: FixtureResult | TestResult | undefined, skipSteps: RegExp[]) {
    if (result && result.steps.length > 0) {
      result.steps = result.steps.filter(t => !skipSteps.some(x => x.test(t.name ?? '')));
      result.steps.forEach(res => {
        this.filterSteps(res, skipSteps);
      });
    }
  }

  endTest(arg: AllureTaskArgs<'testEnded'>): void {
    const { result, details } = arg;
    const storedStatus = this.testStatusStored;
    const storedDetails = this.testDetailsStored;

    /*
      todo case when all steps finished but test failed
      if (this.steps.length === 0) {
       */
    // all ended already
    /*this.currentExecutable?.wrappedItem.steps && this.currentExecutable.wrappedItem.steps.length > 0) {
        this.startStep({ name: 'some of previous steps failed' });
        this.endStep({ status: arg.result, details: arg.details });
      }
      }
    */
    this.endAllSteps({ status: result, details });

    if (!this.currentTest) {
      return;
    }

    removeFirstStepWhenSame(this.currentTest.wrappedItem.steps);
    mergeStepsWithSingleChild(this.currentTest.wrappedItem.steps);

    if (this.currentTestAll) {
      this.currentTestAll.status = result;
    }

    // filter steps here
    this.filterSteps(this.currentTest.wrappedItem, this.allureSkipSteps);
    this.currentTest.wrappedItem.steps = wrapHooks('"before each" hook', this.currentTest.wrappedItem.steps);
    this.currentTest.wrappedItem.steps = wrapHooks('"after each" hook', this.currentTest.wrappedItem.steps);

    this.setExecutableStatus(this.currentTest, result, details);

    if (storedDetails) {
      this.setExecutableStatus(this.currentTest, result, storedDetails.details);
    }

    if (storedStatus) {
      this.setExecutableStatus(this.currentTest, storedStatus.result, storedStatus.details);
    }

    this.applyGroupLabels();
    const uid = this.currentTest.uuid;

    //const resAtt: Attachment[] = [...this.currentTest.wrappedItem.attachments];
    // const attachments = getAllAttachments(this.currentTest.wrappedItem);
    this.currentTest.endTest();
    this.tests.pop();
    this.descriptionHtml = [];
    this.testStatusStored = undefined;
    this.testDetailsStored = undefined;
    this.labels = [];

    const testFile = `${this.allureResults}/${uid}-result.json`;

    if (!existsSync(testFile)) {
      logWithPackage('error', ` Result file doesn't exist: ${testFile}`);
    }

    log('testEnded: will move result to watch folder');
    // do not copy otherwise attachments may not be shown in testops
    // will be moved after spec is done
    // copyFileToWatch({ test: testFile, attachments }, this.allureResultsWatch);
  }

  startStep(arg: AllureTaskArgs<'stepStarted'>) {
    const { name, date } = arg;

    if (!this.currentExecutable || this.globalHooks.currentHook) {
      log('will start step for global hook');
      this.globalHooks.startStep(name);

      return;
    }
    log('start step for current executable');
    const step = this.currentExecutable.startStep(name, date);
    this.steps.push(step);
  }

  endAllSteps(arg: AllureTaskArgs<'stepEnded'>) {
    while (this.steps.length !== 0) {
      this.endStep(arg);
    }
  }

  // set status to last step recursively when unknown or passed statuses
  setLastStepStatus(steps: ExecutableItem[], status: Status, details?: StatusDetails) {
    const stepsCount = steps.length;
    const step = steps[stepsCount - 1];
    const stepStatus = step?.status;

    if (stepsCount > 0) {
      this.setLastStepStatus(step.steps, status, details);
    }

    if (!stepStatus || ![Status.FAILED, Status.SKIPPED, Status.BROKEN].includes(stepStatus)) {
      this.setExecutableItemStatus(step, status, details);
    }
  }

  hasChildrenWith(steps: ExecutableItem[], statuses: Status[]) {
    const stepsCount = steps.length;
    let hasError = false;
    steps.forEach(step => {
      const stepStatus = step.status as Status;

      if (stepStatus && stepsCount > 0 && statuses.includes(stepStatus)) {
        hasError = true;
      }

      if (stepsCount > 0) {
        return this.hasChildrenWith(step.steps, statuses);
      }
    });

    return hasError;
  }

  endStep(arg: AllureTaskArgs<'stepEnded'>) {
    const { status, date, details } = arg;

    if (!this.currentExecutable) {
      log('No current executable, test or hook - will end step for global hook');
      this.globalHooks.endStep(arg.status, details);

      return;
    }

    if (!this.currentStep) {
      //this.setLastStepStatus(this.currentExecutable.wrappedItem.steps, status, details);

      return;
    }

    const markBrokenStatuses = ['failed' as Status, 'broken' as Status];
    const passedStatuses = ['passed' as Status];

    // when unknown or passed
    this.setLastStepStatus(this.currentStep.wrappedItem.steps, status, details);

    if (
      passedStatuses.includes(status as Status) &&
      this.hasChildrenWith(this.currentStep.wrappedItem.steps, markBrokenStatuses)
    ) {
      this.setExecutableStatus(this.currentStep, Status.BROKEN);
    } else {
      this.setExecutableStatus(this.currentStep, status, details);
    }

    this.currentStep.endStep(date ?? Date.now());

    this.steps.pop();
  }

  private executableAttachment(exec: ExecutableItemWrapper | undefined, arg: AllureTaskArgs<'attachment'>) {
    if (!exec) {
      log('No current executable - will not attach');

      return;
    }

    const file = this.allureRuntime.writeAttachment(
      arg.content ?? `Could not create attachment: no content for ${arg.name} received`,
      arg.type,
    );
    exec.addAttachment(arg.name, arg.type, file);
  }

  public setAttached(file: string) {
    const screen = this.screenshotsTest.find(t => t.path === file);

    if (screen) {
      screen.attached = true;
    }
  }

  private executableFileAttachment(exec: ExecutableItemWrapper | undefined, arg: AllureTaskArgs<'fileAttachment'>) {
    if (!this.currentExecutable && this.globalHooks.currentHook) {
      log('No current executable, test or hook - add to global hook');
      this.globalHooks.attachment(arg.name, arg.file, arg.type);

      return;
    }

    if (!exec && !this.currentExecutable) {
      return;
    }

    if (!existsSync(arg.file)) {
      logWithPackage('error', `Attaching file: file ${arg.file} doesnt exist`);

      return;
    }

    try {
      const uuid = randomUUID();

      // to have it in allure-results directory
      const fileNew = `${uuid}-attachment${extname(arg.file)}`;

      if (!existsSync(this.allureResults)) {
        mkdirSync(this.allureResults, { recursive: true });
      }

      const currExec = exec ?? this.currentExecutable;

      if (currExec) {
        copyFileSync(arg.file, `${this.allureResults}/${fileNew}`);
        currExec.addAttachment(arg.name, arg.type, fileNew);
        log(`added attachment: ${fileNew} ${arg.file}`);
        this.setAttached(arg.file);
      }
    } catch (err) {
      logWithPackage('error', `Could not attach ${arg.file}`);
    }
  }

  getEnvInfo(resultsFolder: string): EnvironmentInfo {
    const fileName = 'environment.properties';
    const envPropsFile = `${resultsFolder}/${fileName}`;

    if (!existsSync(envPropsFile)) {
      return {};
    }

    if (existsSync(envPropsFile)) {
      try {
        const env = readFileSync(envPropsFile)?.toString();
        const res: EnvironmentInfo = {};
        env?.split('\n').forEach(line => {
          const keyValue = line.split(' = ');
          res[keyValue[0]] = keyValue[1];
        });

        return res;
      } catch (err) {
        logWithPackage('error', 'could not get exisitng environemnt info');

        return {};
      }
    }

    return {};
  }
}
