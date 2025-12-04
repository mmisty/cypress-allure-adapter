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
import { existsSync } from 'fs';
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
import { mergeStepsWithSingleChild, removeFirstStepWhenSame, wrapHooks } from './helper';
import { TaskManager } from './task-manager';
import { ReportingServer } from './reporting-server';

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
  nestedLevel: number; // Track the nesting level for hook inheritance
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
    private reportingServer: ReportingServer,
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

    // Ensure allure results directory exists (async via reporting server)
    // Note: This is queued and will be ready by the time tests start
    this.taskManager.addTask('__init__', async () => {
      await this.reportingServer.mkdir(this.allureResults, { recursive: true });
    });

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
      nestedLevel: this.groups.length + 1, // 1-based nesting level
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

    // Ensure directory exists asynchronously
    this.taskManager.addTask(this.taskQueueId, async () => {
      await this.reportingServer.mkdir(this.allureResults, { recursive: true });
    });
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

        this.taskManager.addTask(this.taskQueueId, async () => {
          try {
            const contents = await this.reportingServer.readFile(testFile);
            const ext = path.extname(afterSpecRes.path);
            const name = path.basename(afterSpecRes.path);

            type ParsedAttachment = { name: string; type: ContentType; source: string };
            const testCon: { attachments: ParsedAttachment[] } = JSON.parse(contents.toString());
            const uuidNew = randomUUID();
            const nameAttach = `${uuidNew}-attachment${ext}`; // todo not copy same image
            const newPath = path.join(this.allureResults, nameAttach);

            const exists = await this.reportingServer.exists(newPath);

            if (!exists) {
              await this.reportingServer.copyFile(afterSpecRes.path, path.join(this.allureResults, nameAttach));
            }

            if (!testCon.attachments) {
              testCon.attachments = [];
            }

            testCon.attachments.push({
              name: name,
              type: 'image/png',
              source: nameAttach, // todo
            });

            await this.reportingServer.writeFile(testFile, JSON.stringify(testCon));
          } catch (e) {
            logWithPackage('error', `Could not attach screenshot ${afterSpecRes.screenshotId ?? afterSpecRes.path}`);
          }
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

      // Queue the async file operations
      this.taskManager.addTask(this.taskQueueId, async () => {
        await this.reportingServer.mkdir(this.allureResults, { recursive: true });

        const exists = await this.reportingServer.exists(file);

        if (!exists) {
          logWithPackage('log', `file ${file} doesnt exist`);

          return;
        }
        await this.reportingServer.copyFile(file, `${this.allureResults}/${fileNew}`);
      });

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
      await this.reportingServer.mkdir(this.allureResultsWatch, { recursive: true });

      const envExists = await this.reportingServer.exists(envProperties);
      const envTargetExists = await this.reportingServer.exists(targetPath(envProperties));

      if (envExists && !envTargetExists) {
        await this.reportingServer.copyFile(envProperties, targetPath(envProperties), true);
      }

      const execExists = await this.reportingServer.exists(executor);
      const execTargetExists = await this.reportingServer.exists(targetPath(executor));

      if (execExists && !execTargetExists) {
        await this.reportingServer.copyFile(executor, targetPath(executor), true);
      }

      const catExists = await this.reportingServer.exists(categories);
      const catTargetExists = await this.reportingServer.exists(targetPath(categories));

      if (catExists && !catTargetExists) {
        await this.reportingServer.copyFile(categories, targetPath(categories), true);
      }
    });

    const tests = parseAllure(this.allureResults);

    for (const test of tests) {
      this.taskManager.addTask(this.taskQueueId, async () => {
        const testSource = `${this.allureResults}/${test.uuid}-result.json`;
        const testTarget = testSource.replace(this.allureResults, this.allureResultsWatch);

        function getAllParentUuids(test: unknown) {
          const uuids: string[] = [];
          let current = (test as { parent?: { uuid?: string; parent?: unknown } }).parent;

          while (current) {
            if (current.uuid) {
              uuids.push(current.uuid);
            }
            current = current.parent as { uuid?: string; parent?: unknown } | undefined;
          }

          return uuids;
        }

        const containerSources = getAllParentUuids(test).map(uuid => `${this.allureResults}/${uuid}-container.json`);

        const allAttachments = glob.sync(`${this.allureResults}/*-attachment.*`);

        // move attachments referenced in tests or containers - use async reads
        const testContents = await this.reportingServer.readFile(testSource).catch(() => Buffer.from(''));

        const containerContents: Map<string, Buffer> = new Map();

        for (const containerSource of containerSources) {
          const exists = await this.reportingServer.exists(containerSource);

          if (exists) {
            const content = await this.reportingServer.readFile(containerSource).catch(() => Buffer.from(''));
            containerContents.set(containerSource, content);
          }
        }

        const testAttachments = allAttachments.filter(attachFile => {
          const attachBasename = basename(attachFile);

          return (
            testContents.indexOf(attachBasename) !== -1 ||
            Array.from(containerContents.values()).some(content => content.indexOf(attachBasename) !== -1)
          );
        });

        for (const attachFile of testAttachments) {
          const attachTarget = attachFile.replace(this.allureResults, this.allureResultsWatch);

          const attachExists = await this.reportingServer.exists(attachFile);
          const attachTargetExists = await this.reportingServer.exists(attachTarget);

          if (attachExists && !attachTargetExists) {
            await this.reportingServer.copyFile(attachFile, attachTarget, true);
          } else if (attachExists && attachFile !== attachTarget) {
            await this.reportingServer.removeFile(attachFile);
          }
        }

        // copy test results and containers
        const testSourceExists = await this.reportingServer.exists(testSource);

        if (testSourceExists) {
          // should overwrite
          await this.reportingServer.copyFile(testSource, testTarget, true);
        }

        for (const containerSource of containerSources) {
          const containerTarget = containerSource.replace(this.allureResults, this.allureResultsWatch);
          const containerExists = await this.reportingServer.exists(containerSource);

          if (containerExists) {
            await this.reportingServer.copyFile(containerSource, containerTarget, true);
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
          path: t.labels.find((l: { name: string; value: string }) => l.name === 'path')?.value,
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

      // Check video exists using async operation
      const videoExists = await this.reportingServer.exists(videoPath);

      if (!videoExists) {
        logWithPackage('error', `Could not read video: ${videoPath} does not exist`);

        return;
      }

      for (const test of testsWithSameParent) {
        if (!test.parent) {
          logWithPackage('error', `not writing videos since test has no parent suite: ${test.fullName}`);

          return;
        }

        const containerFile = `${this.allureResults}/${test.parent.uuid}-container.json`;
        log(`ATTACHING to container: ${containerFile}`);

        try {
          const contents = await this.reportingServer.readFile(containerFile);
          const uuid = randomUUID();
          const nameAttAhc = `${uuid}-attachment${ext}`;
          const newPath = path.join(this.allureResults, nameAttAhc);
          const newContentJson = createNewContentForContainer(nameAttAhc, contents, ext, specname);
          const newContent = JSON.stringify(newContentJson);

          const newPathExists = await this.reportingServer.exists(newPath);

          if (!newPathExists) {
            await this.reportingServer.copyFile(videoPath, newPath, false);
          } else {
            log(`not writing video, file already exists in path ${newPath}`);
          }

          log(`write result file ${containerFile}`);
          await this.reportingServer.writeFile(containerFile, newContent);
        } catch (err) {
          log(`error reading container: ${(err as Error).message}`);
        }
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
      const nestedLevel = this.currentGroup.nestedLevel;

      // Helper to check if hook should be skipped based on allureSkipSteps
      const shouldIncludeHook = (hookName: string) => this.allureSkipSteps.every(t => !t.test(hookName));

      const scopeHooks = this.allHooks.filter(h => h.scopeUuid === scopeUuid && shouldIncludeHook(h.name));

      // Include inherited before hooks from parent scopes (nested < currentLevel)
      // These are global/parent before hooks that should apply to nested suites
      const inheritedBeforeHooks = this.allHooks.filter(
        h => h.nested < nestedLevel && h.name.includes('"before all" hook') && shouldIncludeHook(h.name),
      );

      const befores: FixtureResult[] = [
        // Inherited before hooks first (from parent scopes) - include steps
        ...inheritedBeforeHooks.map(h => h.result),
        // Then this scope's own before hooks
        ...scopeHooks.filter(h => h.name.includes('"before all" hook')).map(h => h.result),
      ];

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
    // Helper to check if hook should be skipped based on allureSkipSteps
    const shouldIncludeHook = (hookName: string) => this.allureSkipSteps.every(t => !t.test(hookName));

    // Write all remaining groups as containers
    this.groups.forEach(g => {
      const scopeHooks = this.allHooks.filter(h => h.scopeUuid === g.scopeUuid && shouldIncludeHook(h.name));

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

    // Write attachment to file system asynchronously
    const content = arg.content ?? `Could not create attachment: no content for ${arg.name} received`;
    const fileExt = arg.type.split('/')[1] || 'txt';
    const fileName = `${randomUUID()}-attachment.${fileExt}`;

    // Queue the async file write
    this.taskManager.addTask(this.taskQueueId, async () => {
      await this.reportingServer.mkdir(this.allureResults, { recursive: true });
      const contentToWrite = Buffer.isBuffer(content) ? content : content.toString();
      await this.reportingServer.writeFile(`${this.allureResults}/${fileName}`, contentToWrite);
    });

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

    const uuid = randomUUID();
    // to have it in allure-results directory
    const fileNew = `${uuid}-attachment${extname(arg.file)}`;

    const currExec = exec ?? this.currentExecutable;

    if (currExec) {
      currExec.result.attachments.push({
        name: arg.name,
        type: arg.type,
        source: fileNew,
      });
      log(`added attachment: ${fileNew} ${arg.file}`);
      this.setAttached(arg.file);

      // Queue the async file operations
      this.taskManager.addTask(this.taskQueueId, async () => {
        const fileExists = await this.reportingServer.exists(arg.file);

        if (!fileExists) {
          logWithPackage('error', `Attaching file: file ${arg.file} doesnt exist`);

          return;
        }

        try {
          await this.reportingServer.mkdir(this.allureResults, { recursive: true });
          await this.reportingServer.copyFile(arg.file, `${this.allureResults}/${fileNew}`);
        } catch (err) {
          logWithPackage('error', `Could not attach ${arg.file}`);
        }
      });
    }
  }

  getEnvInfo(resultsFolder: string): EnvironmentInfo {
    const fileName = 'environment.properties';
    const envPropsFile = `${resultsFolder}/${fileName}`;

    // Use sync check for this as it's called during sync code path
    // The actual reading will be async in the caller
    if (!existsSync(envPropsFile)) {
      return {};
    }

    return {};
  }

  async getEnvInfoAsync(resultsFolder: string): Promise<EnvironmentInfo> {
    const fileName = 'environment.properties';
    const envPropsFile = `${resultsFolder}/${fileName}`;

    const exists = await this.reportingServer.exists(envPropsFile);

    if (!exists) {
      return {};
    }

    try {
      const envBuffer = await this.reportingServer.readFile(envPropsFile);
      const env = envBuffer.toString();
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
      logWithPackage('error', 'could not get existing environment info');

      return {};
    }
  }
}
