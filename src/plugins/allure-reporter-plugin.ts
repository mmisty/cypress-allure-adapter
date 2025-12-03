import {
  FixtureResult,
  Status,
  StatusDetails,
  StepResult,
  TestResult,
  TestResultContainer,
  Stage as AllureStage,
} from 'allure-js-commons';
import { ReporterRuntime, FileSystemWriter } from 'allure-js-commons/sdk/reporter';
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
  StatusType,
  UNKNOWN,
} from './allure-types';
import { extname, logWithPackage } from '../common';
import type { ContentType } from '../common/types';
import { randomUUID } from 'crypto';
import { copyFileCp, writeResultFile } from './fs-tools';
import { mergeStepsWithSingleChild, removeFirstStepWhenSame, wrapHooks } from './helper';
import { TaskManager } from './task-manager';

const beforeEachHookName = '"before each" hook';
const beforeAllHookName = '"before all" hook';
const afterEachHookName = '"after each" hook';

const isBeforeEachHook = (ttl: string | undefined) => ttl?.indexOf(beforeEachHookName) !== -1;
const isAfterEachHook = (ttl: string | undefined) => ttl?.indexOf(afterEachHookName) !== -1;
const isBeforeAllHook = (ttl: string | undefined) => ttl?.indexOf(beforeAllHookName) !== -1;

const log = Debug('cypress-allure:reporter');

// Helper type for executable items (steps, fixtures, tests)
type ExecutableItem = StepResult | FixtureResult | TestResult;

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

  const after: FixtureResult = {
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
    stage: AllureStage.FINISHED,
    steps: [],
  };

  if (!containerJSON.afters) {
    containerJSON.afters = [];
  }

  containerJSON.afters.push(after);

  return containerJSON;
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

// Wrapper types to maintain compatibility with old API patterns
interface GroupInfo {
  uuid: string;
  name: string;
  scopeUuid: string;
  childUuids: string[]; // Track test UUIDs AND nested suite UUIDs for this group
}

interface TestInfo {
  uuid: string;
  result: TestResult;
}

interface StepInfo {
  uuid: string;
  result: StepResult;
  rootUuid: string;
}

interface HookInfo {
  id?: string;
  uuid: string;
  result: FixtureResult;
  nested: number;
  name: string;
  scopeUuid: string;
}

export class AllureReporter {
  // todo config
  private showDuplicateWarn: boolean;
  private allureResults: string;
  private allureResultsWatch: string;
  private allureAddVideoOnPass: boolean;
  private allureSkipSteps: RegExp[];
  private videos: string;
  private screenshots: string;

  // New UUID-based tracking
  groups: GroupInfo[] = [];
  tests: TestInfo[] = [];
  steps: StepInfo[] = [];
  labels: { name: string; value: string }[] = [];
  globalHooks = new GlobalHooks(this);

  // this is variable for global hooks only
  hooks: HookInfo[] = [];
  allHooks: HookInfo[] = [];

  currentSpec: Cypress.Spec | undefined;
  taskQueueId: string | undefined;
  allureRuntime: ReporterRuntime;
  private writer: FileSystemWriter;
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

    // Ensure allure results directory exists
    if (!existsSync(this.allureResults)) {
      mkdirSync(this.allureResults, { recursive: true });
    }

    // Initialize with new API
    this.writer = new FileSystemWriter({ resultsDir: this.allureResults });
    this.allureRuntime = new ReporterRuntime({ writer: this.writer });
  }

  get currentTestAll() {
    if (this.currentTest && allTests[allTests.length - 1]) {
      return allTests[allTests.length - 1];
    }

    return undefined;
  }

  get currentGroup(): GroupInfo | undefined {
    if (this.groups.length === 0) {
      return undefined;
    }

    return this.groups[this.groups.length - 1];
  }

  get currentTest(): TestInfo | undefined {
    if (this.tests.length === 0) {
      log('No current test!');

      return undefined;
    }

    log('current test');

    return this.tests[this.tests.length - 1];
  }

  get currentHook(): HookInfo | undefined {
    if (this.hooks.length === 0) {
      return undefined;
    }

    log('current hook');

    return this.hooks[this.hooks.length - 1];
  }

  get currentStep(): StepInfo | undefined {
    if (this.steps.length === 0) {
      return undefined;
    }
    log('current step');

    return this.steps[this.steps.length - 1];
  }

  get currentExecutable(): { uuid: string; result: ExecutableItem; rootUuid?: string } | undefined {
    if (this.currentStep) {
      return { uuid: this.currentStep.uuid, result: this.currentStep.result, rootUuid: this.currentStep.rootUuid };
    }

    if (this.currentHook) {
      return { uuid: this.currentHook.uuid, result: this.currentHook.result };
    }

    if (this.currentTest) {
      return { uuid: this.currentTest.uuid, result: this.currentTest.result };
    }

    return undefined;
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

    const scopeUuid = this.allureRuntime.startScope();
    const groupUuid = randomUUID();

    // Add this new group's UUID to parent group's children (for nested suite linking)
    if (this.currentGroup) {
      this.currentGroup.childUuids.push(groupUuid);
      log(`Added nested suite ${groupUuid} (${title}) to parent ${this.currentGroup.name}`);
    }

    this.groups.push({
      uuid: groupUuid,
      name: title,
      scopeUuid,
      childUuids: [],
    });
    log(`SUITES: ${JSON.stringify(this.groups.map(t => t.name))}`);

    this.addGlobalHooks(this.groups.length);
    this.addHooks(this.groups.length);
  }

  addHooks(nested: number) {
    const hooks = this.allHooks.filter(t => t.nested <= nested - 1);

    if (!!this.currentGroup && hooks.length > 0) {
      hooks.forEach(hk => {
        const fixtureType = isBeforeAllHook(hk.name) ? 'before' : 'after';

        const fixtureUuid = this.allureRuntime.startFixture(this.currentGroup!.scopeUuid, fixtureType, {
          name: hk.name,
          start: hk.result.start,
        });

        if (fixtureUuid) {
          this.allureRuntime.updateFixture(fixtureUuid, (fixture: FixtureResult) => {
            fixture.status = hk.result.status;
            fixture.stop = hk.result.stop;
            fixture.attachments = hk.result.attachments;
            fixture.statusDetails = hk.result.statusDetails;
            fixture.parameters = hk.result.parameters;
          });
          this.allureRuntime.stopFixture(fixtureUuid);
        }
      });
    }
  }

  specStarted(args: AllureTaskArgs<'specStarted'>) {
    log('SPEC started');
    log(JSON.stringify(args));
    this.currentSpec = args.spec;
    this.taskQueueId = `${this.currentSpec.relative}`;

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

    const fixtureResult: FixtureResult = {
      name: title,
      status: undefined,
      statusDetails: { message: '', trace: '' },
      stage: AllureStage.RUNNING,
      steps: [],
      attachments: [],
      parameters: [],
      start: date ?? Date.now(),
    };

    if (this.allureSkipSteps.every(t => !t.test(title))) {
      const fixtureType = isBeforeAllHook(title) ? 'before' : 'after';
      const fixtureUuid = this.allureRuntime.startFixture(this.currentGroup.scopeUuid, fixtureType, fixtureResult);

      if (fixtureUuid) {
        const hookInfo: HookInfo = {
          id: hookId,
          uuid: fixtureUuid,
          result: fixtureResult,
          nested: this.groups.length,
          name: title,
          scopeUuid: this.currentGroup.scopeUuid,
        };
        this.hooks.push(hookInfo);
        this.allHooks.push(hookInfo);
      }
    } else {
      // create but not add to suite for steps to be added there
      const hookInfo: HookInfo = {
        id: hookId,
        uuid: randomUUID(),
        result: fixtureResult,
        nested: this.groups.length,
        name: title,
        scopeUuid: this.currentGroup.scopeUuid,
      };
      this.hooks.push(hookInfo);
      this.allHooks.push(hookInfo);
    }
  }

  setExecutableStatus(executableItem: ExecutableItem | undefined, res: Status, dtls?: StatusDetails) {
    if (!executableItem) {
      return;
    }

    if (res === Status.PASSED) {
      executableItem.status = Status.PASSED;
      executableItem.stage = AllureStage.FINISHED;
    }

    if (res === Status.BROKEN) {
      executableItem.status = Status.BROKEN;
      executableItem.stage = AllureStage.FINISHED;
    }

    if (res === Status.FAILED) {
      executableItem.status = Status.FAILED;
      executableItem.stage = AllureStage.FINISHED;

      if (dtls) {
        executableItem.statusDetails.message = dtls.message;
        executableItem.statusDetails.trace = dtls.trace;
      }
    }

    if (res === Status.SKIPPED) {
      executableItem.status = Status.SKIPPED;
      executableItem.stage = AllureStage.PENDING;

      executableItem.statusDetails.message = dtls?.message || 'Suite disabled';
    }

    if (res !== Status.FAILED && res !== Status.BROKEN && res !== Status.PASSED && res !== Status.SKIPPED) {
      executableItem.status = UNKNOWN as Status;
      executableItem.stage = AllureStage.PENDING;

      executableItem.statusDetails.message = dtls?.message || `Result: ${res ?? '<no>'}`;
    }

    if (dtls) {
      executableItem.statusDetails = dtls;
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
      const hasFailedStep = this.currentStep?.result.steps.some(
        s => s.status === Status.FAILED || s.status === Status.BROKEN,
      );
      this.endStep({ status: hasFailedStep ? Status.FAILED : Status.PASSED });
      this.endAllSteps({ status: UNKNOWN });

      return;
    }

    if (this.currentHook) {
      this.filterSteps(this.currentHook.result, this.allureSkipSteps);
      this.currentHook.result.stop = date ?? Date.now();
      this.setExecutableStatus(this.currentHook.result, result, details);
      mergeStepsWithSingleChild(this.currentHook.result.steps);

      // Update the fixture in runtime
      this.allureRuntime.updateFixture(this.currentHook.uuid, (fixture: FixtureResult) => {
        Object.assign(fixture, this.currentHook!.result);
      });
      this.allureRuntime.stopFixture(this.currentHook.uuid);

      this.hooks.pop();

      return;
    }
  }

  endHooks(status: StatusType = Status.PASSED) {
    this.hooks.forEach(h => {
      this.hookEnded({ title: h.name, result: status });
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

        this.taskManager.addTask(this.taskQueueId, () => {
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

      if (attachTo) {
        attachTo.result.attachments.push({
          name: basename(file),
          type: 'image/png',
          source: fileNew,
        });
      }
    });
  }

  /**
   * this is for test ops watch mode - if we put it before file is ready it will not be updated in testops
   */
  afterSpecMoveToWatch() {
    const envProperties = `${this.allureResults}/environment.properties`;
    const executor = `${this.allureResults}/executor.json`;
    const categories = `${this.allureResults}/categories.json`;

    const targetPath = (src: string) => {
      return src.replace(this.allureResults, this.allureResultsWatch);
    };

    this.taskManager.addTask(this.taskQueueId, async () => {
      if (!existsSync(this.allureResultsWatch)) {
        mkdirSync(this.allureResultsWatch);
      }

      if (existsSync(envProperties) && !existsSync(targetPath(envProperties))) {
        await copyFileCp(envProperties, targetPath(envProperties), true);
      }

      if (existsSync(executor) && !existsSync(targetPath(executor))) {
        await copyFileCp(executor, targetPath(executor), true);
      }

      if (existsSync(categories) && !existsSync(targetPath(categories))) {
        await copyFileCp(categories, targetPath(categories), true);
      }
    });

    const tests = parseAllure(this.allureResults);

    for (const test of tests) {
      this.taskManager.addTask(this.taskQueueId, async () => {
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

        const allAttachments = glob.sync(`${this.allureResults}/*-attachment.*`);

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

  /**
   * Attach video to parent suite
   * @param arg {path: string}
   */
  attachVideoToContainers(arg: { path: string }) {
    // this happens after test and suites have already finished
    const { path: videoPath } = arg;

    this.taskManager.addTask(this.taskQueueId, async () => {
      logWithPackage('log', `start attaching video for ${this.taskQueueId}`);
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

        return Promise.resolve();
      }

      for (const test of testsWithSameParent) {
        if (!test.parent) {
          logWithPackage('error', `not writing videos since test has no parent suite: ${test.fullName}`);

          return Promise.resolve();
        }

        const containerFile = `${this.allureResults}/${test.parent.uuid}-container.json`;
        log(`ATTACHING to container: ${containerFile}`);

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
      }

      logWithPackage('log', `end attaching video for ${this.taskQueueId}`);
    });
  }

  endGroup() {
    this.addGlobalHooks(this.groups.length);

    if (this.currentGroup) {
      log('END GROUP');

      // Collect befores and afters from hooks that belong to this scope
      const scopeUuid = this.currentGroup.scopeUuid;
      const scopeHooks = this.allHooks.filter(h => h.scopeUuid === scopeUuid);

      const befores: FixtureResult[] = scopeHooks.filter(h => h.name.includes('"before all" hook')).map(h => h.result);

      const afters: FixtureResult[] = scopeHooks.filter(h => !h.name.includes('"before all" hook')).map(h => h.result);

      // Write container in v2 format (compatible with allure-js-parser)
      const container: TestResultContainer = {
        uuid: this.currentGroup.uuid,
        name: this.currentGroup.name,
        children: [...new Set(this.currentGroup.childUuids)],
        befores,
        afters,
      };

      // Only write if there are tests or fixtures
      if (container.children.length > 0 || befores.length > 0 || afters.length > 0) {
        this.writer.writeGroup(container);
      }

      this.groups.pop();
    }
  }

  endAllGroups() {
    log('endAllGroups');
    // Write all remaining groups as containers
    this.groups.forEach(g => {
      const scopeHooks = this.allHooks.filter(h => h.scopeUuid === g.scopeUuid);

      const befores: FixtureResult[] = scopeHooks.filter(h => h.name.includes('"before all" hook')).map(h => h.result);

      const afters: FixtureResult[] = scopeHooks.filter(h => !h.name.includes('"before all" hook')).map(h => h.result);

      const container: TestResultContainer = {
        uuid: g.uuid,
        name: g.name,
        children: [...new Set(g.childUuids)],
        befores,
        afters,
      };

      if (container.children.length > 0 || befores.length > 0 || afters.length > 0) {
        this.writer.writeGroup(container);
      }
    });
    this.groups = [];
    this.allHooks = [];
  }

  label(arg: AllureTaskArgs<'label'>) {
    if (this.currentTest) {
      this.currentTest.result.labels.push({ name: arg.name, value: arg.value });
    }
  }

  link(arg: AllureTaskArgs<'link'>) {
    if (this.currentTest) {
      this.currentTest.result.links.push({ url: arg.url, name: arg.name, type: arg.type });
    }
  }

  fullName(arg: AllureTaskArgs<'fullName'>) {
    if (this.currentTest) {
      this.currentTest.result.fullName = arg.value;
      // should update history id when updating title
      this.currentTest.result.historyId = getUuid(arg.value);
    }
  }

  historyId(arg: AllureTaskArgs<'fullName'>) {
    if (this.currentTest) {
      this.currentTest.result.historyId = arg.value;
    }
  }

  parameter(arg: AllureTaskArgs<'parameter'>) {
    if (this.currentExecutable) {
      // Stringify object values to ensure Parameter.value is always a string
      const value = typeof arg.value === 'object' ? JSON.stringify(arg.value) : arg.value;
      this.currentExecutable.result.parameters.push({ name: arg.name, value });
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
      this.currentTest.result.parameters.push({ name: arg.name, value: arg.value });
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
      this.currentTest?.result.labels.push({ name: LabelName.PACKAGE, value: paths.join('.') });
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

    const testResult: Partial<TestResult> = {
      name: title,
      fullName: fullTitle,
      historyId: getUuid(fullTitle),
      labels: [],
      links: [],
      start: Date.now(),
    };

    const scopeUuids = this.groups.map(g => g.scopeUuid);
    const testUuid = this.allureRuntime.startTest(testResult, scopeUuids);

    // Track test UUID only in the immediate parent group (currentGroup)
    // The nested suite chain is maintained by child suite UUIDs in parent's children
    if (this.currentGroup) {
      this.currentGroup.childUuids.push(testUuid);
      log(`Added test ${testUuid} to group ${this.currentGroup.name}`);
    }

    const testInfo: TestInfo = {
      uuid: testUuid,
      result: {
        uuid: testUuid,
        name: title,
        fullName: fullTitle,
        historyId: getUuid(fullTitle),
        labels: [],
        links: [],
        status: undefined,
        statusDetails: {},
        stage: AllureStage.RUNNING,
        steps: [],
        attachments: [],
        parameters: [],
        start: Date.now(),
      },
    };

    allTests.push({
      retryIndex: currentRetry,
      specRelative: this.currentSpec?.relative,
      fullTitle,
      mochaId: id,
      uuid: testUuid,
    });
    this.tests.push(testInfo);

    this.addGroupLabels();

    if (this.currentSpec?.relative) {
      testInfo.result.labels.push({ name: 'path', value: this.currentSpec.relative });
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
      this.currentTest.result.descriptionHtml = this.descriptionHtml.join('');
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
        this.currentTest.result.labels.push({ name: lastLabel.name, value: lastLabel.value });
      }
    };

    applyLabel(LabelName.PARENT_SUITE);
    applyLabel(LabelName.SUITE);
    applyLabel(LabelName.SUB_SUITE);
  }

  filterSteps(result: FixtureResult | TestResult | StepResult | undefined, skipSteps: RegExp[]) {
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

    this.endAllSteps({ status: result, details });

    if (!this.currentTest) {
      return;
    }

    removeFirstStepWhenSame(this.currentTest.result.steps);
    mergeStepsWithSingleChild(this.currentTest.result.steps);

    if (this.currentTestAll) {
      this.currentTestAll.status = result;
    }

    // filter steps here
    this.filterSteps(this.currentTest.result, this.allureSkipSteps);
    this.currentTest.result.steps = wrapHooks('"before each" hook', this.currentTest.result.steps);
    this.currentTest.result.steps = wrapHooks('"after each" hook', this.currentTest.result.steps);

    this.setExecutableStatus(this.currentTest.result, result, details);

    if (storedDetails) {
      this.setExecutableStatus(this.currentTest.result, result, storedDetails.details);
    }

    if (storedStatus) {
      this.setExecutableStatus(this.currentTest.result, storedStatus.result, storedStatus.details);
    }

    this.applyGroupLabels();
    const uid = this.currentTest.uuid;

    // Update the test in runtime before writing
    this.allureRuntime.updateTest(uid, (test: TestResult) => {
      Object.assign(test, this.currentTest!.result);
    });
    this.allureRuntime.stopTest(uid);
    this.allureRuntime.writeTest(uid);

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
  }

  startStep(arg: AllureTaskArgs<'stepStarted'>) {
    const { name, date } = arg;

    if (!this.currentExecutable || this.globalHooks.currentHook) {
      log('will start step for global hook');
      this.globalHooks.startStep(name);

      return;
    }

    log('start step for current executable');

    const stepResult: StepResult = {
      name,
      status: undefined,
      statusDetails: {},
      stage: AllureStage.RUNNING,
      steps: [],
      attachments: [],
      parameters: [],
      start: date ?? Date.now(),
    };

    // Generate a UUID for tracking, but handle steps locally (not via runtime)
    // The runtime will receive the steps when we update the test result before writing
    const rootUuid = this.currentTest?.uuid ?? this.currentHook?.uuid;
    const stepUuid = randomUUID();

    // Add to parent's steps array for local tracking
    if (this.currentStep) {
      this.currentStep.result.steps.push(stepResult);
    } else if (this.currentHook) {
      this.currentHook.result.steps.push(stepResult);
    } else if (this.currentTest) {
      this.currentTest.result.steps.push(stepResult);
    }

    this.steps.push({
      uuid: stepUuid,
      result: stepResult,
      rootUuid: rootUuid ?? '',
    });
  }

  endAllSteps(arg: AllureTaskArgs<'stepEnded'>) {
    while (this.steps.length !== 0) {
      this.endStep(arg);
    }
  }

  // set status to last step recursively when unknown or passed statuses
  setLastStepStatus(steps: StepResult[], status: Status, details?: StatusDetails) {
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

  hasChildrenWith(steps: StepResult[], statuses: Status[]) {
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
      return;
    }

    const markBrokenStatuses = ['failed' as Status, 'broken' as Status];
    const passedStatuses = ['passed' as Status];

    // when unknown or passed
    this.setLastStepStatus(this.currentStep.result.steps, status, details);

    if (
      passedStatuses.includes(status as Status) &&
      this.hasChildrenWith(this.currentStep.result.steps, markBrokenStatuses)
    ) {
      this.setExecutableStatus(this.currentStep.result, Status.BROKEN);
    } else {
      this.setExecutableStatus(this.currentStep.result, status, details);
    }

    this.currentStep.result.stop = date ?? Date.now();
    this.currentStep.result.stage = AllureStage.FINISHED;

    // Steps are tracked locally and will be included when we update the test result
    this.steps.pop();
  }

  private executableAttachment(
    exec: { uuid: string; result: ExecutableItem; rootUuid?: string } | undefined,
    arg: AllureTaskArgs<'attachment'>,
  ) {
    if (!exec) {
      log('No current executable - will not attach');

      return;
    }

    // Write attachment to file system
    const content = arg.content ?? `Could not create attachment: no content for ${arg.name} received`;
    const fileExt = arg.type.split('/')[1] || 'txt';
    const fileName = `${randomUUID()}-attachment.${fileExt}`;

    if (!existsSync(this.allureResults)) {
      mkdirSync(this.allureResults, { recursive: true });
    }

    writeFileSync(`${this.allureResults}/${fileName}`, content);

    exec.result.attachments.push({
      name: arg.name,
      type: arg.type,
      source: fileName,
    });
  }

  public setAttached(file: string) {
    const screen = this.screenshotsTest.find(t => t.path === file);

    if (screen) {
      screen.attached = true;
    }
  }

  private executableFileAttachment(
    exec: { uuid: string; result: ExecutableItem; rootUuid?: string } | TestInfo | undefined,
    arg: AllureTaskArgs<'fileAttachment'>,
  ) {
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
        currExec.result.attachments.push({
          name: arg.name,
          type: arg.type,
          source: fileNew,
        });
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
          // Handle both old format (key = value) and new format (key=value)
          const separatorIndex = line.indexOf('=');

          if (separatorIndex > 0) {
            let key = line.substring(0, separatorIndex);
            let value = line.substring(separatorIndex + 1);
            // Trim spaces for old format compatibility
            key = key.trim();
            value = value.trim();

            if (key) {
              res[key] = value;
            }
          }
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
