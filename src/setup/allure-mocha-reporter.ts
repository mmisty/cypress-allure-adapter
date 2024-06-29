import { createMessage, MessageManager } from './websocket';
import { handleCyLogEvents } from './cypress-events';
import {
  AllureTransfer,
  EnvironmentInfo,
  ExecutorInfo,
  RequestTask,
  Status,
  Category,
  LabelName,
  LinkType,
} from '../plugins/allure-types'; // todo
import { registerScreenshotHandler } from './screenshots';
import StatusDetails = Cypress.StatusDetails;
import { logClient } from './helper';
import { packageLog, tmsIssueUrl } from '../common';
import { EventEmitter } from 'events';
import AllureEvents = Cypress.AllureEvents;

const dbg = 'cypress-allure:mocha-reporter';
// this is running in Browser
const TEST_PENDING_DETAILS = 'Test ignored';

const MOCHA_EVENTS = {
  RUN_BEGIN: 'start',
  SUITE_BEGIN: 'suite',
  HOOK_START: 'hook',
  HOOK_END: 'hook end',
  TEST_BEGIN: 'test',
  TEST_FAIL: 'fail',
  TEST_PASS: 'pass',
  TEST_RETRY: 'retry',
  TEST_END: 'test end',
  TEST_PENDING: 'pending',
  SUITE_END: 'suite end',
  RUN_END: 'end',
};

const CUSTOM_EVENTS = {
  TEST_BEGIN: 'test begin allure',
  TEST_FAIL: 'test fail allure',
  TEST_PASS: 'test pass allure',
  TEST_END: 'test end allure',
  HOOK_END: 'hook end allure',
  TASK: 'task',
  GLOBAL_HOOK_FAIL: 'global hook fail',
};

const USER_EVENTS = {
  TEST_START: 'test:started',
  TEST_END: 'test:ended',
  CMD_END: 'cmd:ended',
  CMD_START: 'cmd:started',
};

const convertState = (state: string): Status => {
  if (state === 'pending') {
    return Status.SKIPPED;
  }

  return state as Status; // todo
};

const isRootSuite = (suite: Mocha.Suite) => {
  return suite.fullTitle() === '';
};

const isRootSuiteTest = (test: Mocha.Test) => {
  return test.parent?.title === '';
};

const allureEventsEmitter = new EventEmitter();

const eventsInterfaceInstance = (isStub: boolean): AllureEvents => ({
  on: (event, testHandler) => {
    const debug = logClient(dbg);

    if (
      isStub &&
      ![USER_EVENTS.TEST_START, USER_EVENTS.TEST_END, USER_EVENTS.CMD_END, USER_EVENTS.CMD_START].includes(event)
    ) {
      return;
    }

    debug(`ADD LISTENER: ${event}`);

    allureEventsEmitter.addListener(event, testHandler);
  },
});

export const allureInterface = (
  env: Record<string, string>,
  fn: <T extends RequestTask>(data: AllureTransfer<T> | string) => void,
): Cypress.AllureReporter<void> => {
  return {
    writeEnvironmentInfo: (info: EnvironmentInfo) => fn({ task: 'writeEnvironmentInfo', arg: { info } }),
    writeExecutorInfo: (info: ExecutorInfo) => fn({ task: 'writeExecutorInfo', arg: { info } }),
    writeCategoriesDefinitions: (categories: Category[] | string) =>
      fn({ task: 'writeCategoriesDefinitions', arg: { categories } }),
    startStep: (name: string, date?: number) => fn({ task: 'stepStarted', arg: { name, date: date ?? Date.now() } }),
    // remove from interface
    mergeStepMaybe: (name: string) => fn({ task: 'mergeStepMaybe', arg: { name } }),
    endStep: (status?: Status, statusDetails?: StatusDetails, date?: number) =>
      fn({
        task: 'stepEnded',
        arg: { status: status ?? Status.PASSED, details: statusDetails, date: date ?? Date.now() },
      }),

    step: (name: string, status?: Status) =>
      fn({ task: 'step', arg: { name, status: status ?? Status.PASSED, date: Date.now() } }),

    deleteResults: () => fn({ task: 'deleteResults', arg: {} }),
    fullName: (value: string) => fn({ task: 'fullName', arg: { value } }),
    historyId: (value: string) => fn({ task: 'historyId', arg: { value } }),
    testAttachment: (name: string, content: string | Buffer, type) =>
      fn({ task: 'testAttachment', arg: { name, content, type } }),
    testStatus: (result: Status, details?: StatusDetails) => fn({ task: 'testStatus', arg: { result, details } }),
    testDetails: (details?: StatusDetails) => fn({ task: 'testDetails', arg: { details } }),
    testFileAttachment: (name: string, file: string, type) =>
      fn({ task: 'testFileAttachment', arg: { name, file, type } }),
    fileAttachment: (name: string, file: string, type) => fn({ task: 'fileAttachment', arg: { name, file, type } }),
    attachment: (name: string, content: string | Buffer, type) =>
      fn({ task: 'attachment', arg: { name, content, type } }),

    parameter: (name: string, value: string) => fn({ task: 'parameter', arg: { name, value } }),
    parameters: (...params: Cypress.Parameter[]) =>
      params.forEach(p => fn({ task: 'parameter', arg: { name: p.name, value: p.value } })),
    testParameter(name: string, value: string): void {
      fn({ task: 'testParameter', arg: { name, value } });
    },
    addDescriptionHtml(value: string): void {
      fn({ task: 'addDescriptionHtml', arg: { value } });
    },

    link: (url: string, name?: string, type?: 'issue' | 'tms') => fn({ task: 'link', arg: { url, name, type } }),
    tms: (url: string, name?: string) => {
      const type: LinkType = 'tms';
      const fullUrl = tmsIssueUrl(env, url, type);
      const linkName = name ?? url;

      return fn({ task: 'link', arg: { url: fullUrl, name: linkName, type } });
    },

    issue: (url: string, name?: string) => {
      const type: LinkType = 'issue';
      const fullUrl = tmsIssueUrl(env, url, type);
      const linkName = name ?? url;

      return fn({ task: 'link', arg: { url: fullUrl, name: linkName, type } });
    },

    label: (name: string, value: string) => fn({ task: 'label', arg: { name, value } }),
    suite: (name: string) => fn({ task: 'suite', arg: { name } }),
    parentSuite: (name: string) => fn({ task: 'parentSuite', arg: { name } }),
    subSuite: (name: string) => fn({ task: 'subSuite', arg: { name } }),
    tag: (...tags: string[]) => tags.forEach(tag => fn({ task: 'label', arg: { name: LabelName.TAG, value: tag } })),
    severity: (value: Cypress.Severity) => fn({ task: 'label', arg: { name: LabelName.SEVERITY, value } }),
    language: (value: string) => fn({ task: 'label', arg: { name: LabelName.LANGUAGE, value } }),
    owner: (value: string) => fn({ task: 'label', arg: { name: LabelName.OWNER, value } }),
    os: (value: string) => fn({ task: 'label', arg: { name: 'os', value } }),
    host: (value: string) => fn({ task: 'label', arg: { name: LabelName.HOST, value } }),
    layer: (value: string) => fn({ task: 'label', arg: { name: LabelName.LAYER, value } }),
    browser: (value: string) => fn({ task: 'label', arg: { name: 'browser', value } }),
    device: (value: string) => fn({ task: 'label', arg: { name: 'device', value } }),
    lead: (value: string) => fn({ task: 'label', arg: { name: LabelName.LEAD, value } }),
    feature: (value: string) => fn({ task: 'label', arg: { name: LabelName.FEATURE, value } }),
    story: (value: string) => fn({ task: 'label', arg: { name: LabelName.STORY, value } }),
    epic: (value: string) => fn({ task: 'label', arg: { name: LabelName.EPIC, value } }),
    allureId: (value: string) => fn({ task: 'label', arg: { name: LabelName.ALLURE_ID, value } }),
    thread: (value: string) => fn({ task: 'label', arg: { name: LabelName.THREAD, value } }),
  };
};

export const registerStubReporter = () => {
  Cypress.Allure = {
    ...allureInterface(Cypress.env(), () => {
      // do nothing when no allure reporting enabled
    }),
    ...eventsInterfaceInstance(true),
  };
};

const isBeforeAllHook = (test: Mocha.Test) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (test as any).type === 'hook' && (test as any).hookName === 'before all';
};

const isBeforeEachHook = (test: Mocha.Test) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (test as any).type === 'hook' && (test as any).hookName === 'before each';
};

const isAfterEachHook = (test: Mocha.Test) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (test as any).type === 'hook' && (test as any).hookName === 'after each';
};

const isHook = (test: Mocha.Test) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (test as any).type === 'hook';
};

const createTestsForFailedBeforeHook = (runner: Mocha.Runner, test: Mocha.Test) => {
  let index = 0;
  test.parent?.eachTest(ts => {
    ts.err = test.err;

    index++;

    if (ts) {
      if (index === 1) {
        ts.state = 'failed';

        if (ts.err) {
          // Cypress error cannot be taken here - it will be updated only on 'test:after:run' event
          // so to simplify events chain creating own error message
          // need to watch cypress error text message when it changes - and update it here
          ts.err.message =
            `${ts.err.message}\n\n` +
            `Because this error occurred during a \`before all\` hook we are skipping the remaining tests in the current suite: \`${ts.parent?.title}\` (added by ${packageLog})`;
        }
      }
      runner.emit(CUSTOM_EVENTS.TEST_BEGIN, ts);
      runner.emit(CUSTOM_EVENTS.TEST_FAIL, ts);
      runner.emit(CUSTOM_EVENTS.TEST_END, ts);
    }
  });
};

/**
 * Will create synthetic tests that were not run for allure report with unknown status
 * @param runner
 * @param test - hook that failed
 */
const createTestsBeforeAfterEach = (runner: Mocha.Runner, test: Mocha.Test) => {
  let index = 0;
  let failedIndex = 0;
  let found = false;

  test.parent?.eachTest(ts => {
    ts.err = test.err;
    // test.title is hook title like ""before each" hook: Named hook for "test 05""
    const startFrom = test.title.indexOf(ts.title);
    index++;

    if (!found && startFrom !== -1) {
      found = true;
      failedIndex = index;
    }

    if (found && index > failedIndex) {
      runner.emit(CUSTOM_EVENTS.TEST_BEGIN, ts);
      runner.emit(CUSTOM_EVENTS.TEST_FAIL, ts);
      runner.emit(CUSTOM_EVENTS.TEST_END, ts);
    }
  });
};

const createTestsForSuite = (runner: Mocha.Runner, testOrHook: Mocha.Test, suite: Mocha.Suite) => {
  // let index = 0;

  runner.emit(CUSTOM_EVENTS.TASK, { task: 'endAll', arg: {} });
  runner.emit(MOCHA_EVENTS.SUITE_BEGIN, suite);

  suite?.eachTest(ts => {
    ts.err = testOrHook.err;

    // index++;

    if (ts) {
      runner.emit(CUSTOM_EVENTS.TEST_BEGIN, ts);
      runner.emit(CUSTOM_EVENTS.TEST_FAIL, ts);
      runner.emit(CUSTOM_EVENTS.TEST_END, ts);
    }
  });
  runner.emit(MOCHA_EVENTS.SUITE_END, suite);
};

const sendMessageTestCreator = (messageManager: MessageManager, specPathLog: string) => (msg: string) => {
  if (isJestTest()) {
    messageManager.message({ task: 'testMessage', arg: { path: specPathLog, message: msg } });
  }
};

const isJestTest = () => {
  return Cypress.env('JEST_TEST') === 'true' || Cypress.env('JEST_TEST') === true;
};

const registerTestEvents = (messageManager: MessageManager, specPathLog: string) => {
  if (isJestTest()) {
    const msg = sendMessageTestCreator(messageManager, specPathLog);
    Cypress.Allure.on('test:started', () => {
      msg('plugin test:started');
    });

    Cypress.Allure.on('test:ended', () => {
      msg('plugin test:ended');
    });
  }
};

export const registerMochaReporter = (ws: WebSocket) => {
  const tests: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;
  runner.setMaxListeners(20);
  const messageManager = createMessage(ws);
  const message = messageManager.message;
  allureEventsEmitter.removeAllListeners();

  const allureInterfaceInstance = allureInterface(Cypress.env(), message);
  const allureEvents = eventsInterfaceInstance(false);
  Cypress.Allure = { ...allureInterfaceInstance, ...allureEvents };
  const startedSuites: Mocha.Suite[] = [];
  const specPathLog = `reports/test-events/${Cypress.spec.name}.log`;
  const sendMessageTest = sendMessageTestCreator(messageManager, specPathLog);
  registerScreenshotHandler(messageManager, sendMessageTest);

  const debug = logClient(dbg);

  if (isJestTest()) {
    messageManager.message({ task: 'delete', arg: { path: specPathLog } });
  }

  let createTestsCallb: (() => void) | undefined = undefined;
  registerTestEvents(messageManager, specPathLog);

  runner
    .once(MOCHA_EVENTS.RUN_BEGIN, () => {
      debug(`event ${MOCHA_EVENTS.RUN_BEGIN}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.RUN_BEGIN}`);
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'endAll', arg: {} });
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'specStarted', arg: { spec: Cypress.spec } });
      messageManager.process();
    })

    .on(MOCHA_EVENTS.SUITE_BEGIN, suite => {
      debug(`event ${MOCHA_EVENTS.SUITE_BEGIN}: ${suite.title}, ${suite.fullTitle()}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.SUITE_BEGIN}: ${suite.title}, ${suite.fullTitle()}`);

      if (isRootSuite(suite)) {
        runner.emit(CUSTOM_EVENTS.TASK, { task: 'endAll', arg: {} });

        return;
      }

      startedSuites.push(suite);
      runner.emit(CUSTOM_EVENTS.TASK, {
        task: 'suiteStarted',
        arg: { title: suite.title, fullTitle: suite.fullTitle(), file: suite.file },
      });
    })

    .on(MOCHA_EVENTS.HOOK_START, hook => {
      debug(`event ${MOCHA_EVENTS.HOOK_START}: ${hook.title}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.HOOK_START}: ${hook.title}`);

      if (isBeforeAllHook(hook) && isRootSuiteTest(hook)) {
        debug('GLOBAL BEFORE ALL - end all existing');
        runner.emit(CUSTOM_EVENTS.TASK, { task: 'endAll', arg: {} });
      }

      runner.emit(CUSTOM_EVENTS.TASK, {
        task: 'hookStarted',
        arg: { title: hook.title, file: hook.file, hookId: hook.hookId },
      });
    })

    .on(MOCHA_EVENTS.HOOK_END, hook => {
      // this event is not fired when hook fails
      debug(`event ${MOCHA_EVENTS.HOOK_END}: ${hook.title}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.HOOK_END}: ${hook.title}`);

      if (isBeforeAllHook(hook) && isRootSuiteTest(hook)) {
        debug('GLOBAL BEFORE ALL - end all existing ');
        runner.emit(CUSTOM_EVENTS.TASK, { task: 'endAll', arg: {} });
      }

      runner.emit(CUSTOM_EVENTS.TASK, {
        task: 'hookEnded',
        // since event is not fired when hook fails always passed here
        arg: { title: hook.title, result: Status.PASSED },
      });
    })

    .on(MOCHA_EVENTS.TEST_PENDING, test => {
      debug(`event ${MOCHA_EVENTS.TEST_PENDING}: ${test.title}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.TEST_PENDING}: ${test.title}`);
      // ignore
    })

    .on(MOCHA_EVENTS.TEST_BEGIN, (test: Mocha.Test) => {
      // no event when global hook fails
      debug(`event ${MOCHA_EVENTS.TEST_BEGIN}: ${test.title}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.TEST_BEGIN}: ${test.title}`);
      debug(`${JSON.stringify(tests)}`);

      runner.emit(CUSTOM_EVENTS.TEST_BEGIN, test);
    })

    .on(MOCHA_EVENTS.TEST_FAIL, (test: Mocha.Test) => {
      debug(`event ${MOCHA_EVENTS.TEST_FAIL}: ${test?.title}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.TEST_FAIL}: ${test?.title}`);

      if (isBeforeEachHook(test) || isAfterEachHook(test)) {
        runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);

        // hook end not fired when hook fails
        runner.emit(CUSTOM_EVENTS.HOOK_END, test);

        // when before/after each fails all tests are skipped in current suite
        // will create synthetic tests after test ends in cypress event
        createTestsCallb = () => createTestsBeforeAfterEach(runner, test);

        return;
      }

      if (isBeforeAllHook(test)) {
        // hook end not fired when hook fails
        runner.emit(CUSTOM_EVENTS.HOOK_END, test);

        if (isRootSuiteTest(test)) {
          // only for root suite
          runner.emit(CUSTOM_EVENTS.GLOBAL_HOOK_FAIL, test);

          return;
        }

        runner.emit(CUSTOM_EVENTS.TEST_END, test);
        createTestsForFailedBeforeHook(runner, test);

        return;
      }

      runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);

      // hook end not fired when hook fails
      if (isHook(test)) {
        runner.emit(CUSTOM_EVENTS.HOOK_END, test);
      }

      return;
    })

    .on(MOCHA_EVENTS.TEST_RETRY, test => {
      debug(`event ${MOCHA_EVENTS.TEST_RETRY}: ${test.title}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.TEST_RETRY}: ${test.title}`);
      runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);
    })

    .on(MOCHA_EVENTS.TEST_PASS, test => {
      debug(`event ${MOCHA_EVENTS.TEST_PASS}: ${test.title}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.TEST_PASS}: ${test.title}`);

      runner.emit(CUSTOM_EVENTS.TASK, {
        task: 'testResult',
        arg: {
          title: test.title,
          id: test.id,
          result: convertState('passed'),
        },
      });
    })

    .on(MOCHA_EVENTS.TEST_END, test => {
      debug(`event ${MOCHA_EVENTS.TEST_END}: ${test.title}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.TEST_END}: ${test.title}`);
    })

    .on(MOCHA_EVENTS.SUITE_END, suite => {
      debug(`event ${MOCHA_EVENTS.SUITE_END}: ${suite.title} ${suite.file}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.SUITE_END}: ${suite.title}`);

      if (isRootSuite(suite)) {
        //end run
        runner.emit(CUSTOM_EVENTS.TASK, { task: 'suiteEnded', arg: {} });
        runner.emit(CUSTOM_EVENTS.TASK, { task: 'message', arg: { name: 'RUN_END' } });

        return;
      }

      if (startedSuites.length === 1) {
        // startedSuites doesn't include root suite
        // will end later with run end since there are more
        // events after suite finished

        return;
      }

      startedSuites.pop();
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'suiteEnded', arg: {} });
    })

    .on(MOCHA_EVENTS.RUN_END, () => {
      // note that Coverage tasks doesn't work here anymore
      // since they use after and afterEach hooks
      debug(`event ${MOCHA_EVENTS.RUN_END}: tests length ${tests.length}`);
      sendMessageTest(`mocha: ${MOCHA_EVENTS.RUN_END}`);
      messageManager.stop();
    });

  // custom events
  runner
    .on(CUSTOM_EVENTS.HOOK_END, hook => {
      debug(`event ${CUSTOM_EVENTS.HOOK_END}: ${hook.title}`);

      message({
        task: 'hookEnded',
        arg: {
          title: hook.title,
          result: hook.err ? Status.FAILED : Status.PASSED,
          details: {
            message: hook.err?.message,
            trace: hook.err?.stack,
          },
        },
      });
    })

    .once(CUSTOM_EVENTS.GLOBAL_HOOK_FAIL, hook => {
      debug(`event ${CUSTOM_EVENTS.GLOBAL_HOOK_FAIL}: ${hook.title}`);

      for (const sui of hook.parent?.suites) {
        createTestsCallb = () => createTestsForSuite(runner, hook, sui);
      }
    })

    .on(CUSTOM_EVENTS.TEST_BEGIN, test => {
      debug(`event ${CUSTOM_EVENTS.TEST_BEGIN}: ${test.title}`);

      message({
        task: 'testStarted',
        arg: { title: test.title, fullTitle: test.fullTitle(), id: test.id, currentRetry: test._currentRetry },
      });

      allureEventsEmitter.emit(USER_EVENTS.TEST_START, test, () => {
        debug('After start callback');
      });
    })

    .on(CUSTOM_EVENTS.TASK, payload => {
      debug(`event ${CUSTOM_EVENTS.TASK}`);
      debug(payload);

      message(payload);
    })

    .on(CUSTOM_EVENTS.TEST_FAIL, (test: Mocha.Test) => {
      debug(`event ${CUSTOM_EVENTS.TEST_FAIL}: ${test.title}`);
      message({
        task: 'testResult',
        arg: {
          title: test?.title,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          id: (test as any)?.id,
          result: convertState('failed'),
          details: { message: test?.err?.message, trace: test?.err?.stack },
        },
      });
    })

    .on(CUSTOM_EVENTS.TEST_END, test => {
      debug(`event ${CUSTOM_EVENTS.TEST_END}: ${test.title}`);

      tests.pop();
      allureEventsEmitter.emit(USER_EVENTS.TEST_END, test);
      const detailsErr = test.err as Error;
      const testState = convertState(test.state);
      const detailsMessage = (msg?: string) => (!msg && testState === 'skipped' ? TEST_PENDING_DETAILS : msg);

      message({
        task: 'testEnded',
        arg: {
          result: testState,
          details: {
            message: detailsMessage(detailsErr?.message),
            trace: detailsErr?.stack,
          },
        },
      });
    });

  if (isJestTest()) {
    Cypress.on('test:before:run', (_t, test) => {
      sendMessageTest(`cypress: test:before:run: ${test.title}`);
    });
  }

  Cypress.on('test:after:run', (_t, test) => {
    sendMessageTest(`cypress: test:after:run: ${test.title}`);
    runner.emit(CUSTOM_EVENTS.TEST_END, test);

    if (createTestsCallb) {
      createTestsCallb();
      createTestsCallb = undefined;
    }
    runner.emit(CUSTOM_EVENTS.TASK, { task: 'message', arg: { name: `******** test:after:run=${test.title}` } });
  });

  handleCyLogEvents(runner, allureEventsEmitter, {
    ignoreCommands: () => (Cypress.env('allureSkipCommands') ?? '').split(','),
    allureLogCyCommands: () =>
      Cypress.env('allureLogCyCommands') === undefined ||
      Cypress.env('allureLogCyCommands') === 'true' ||
      Cypress.env('allureLogCyCommands') === true,
    wrapCustomCommands: () => {
      if (
        Cypress.env('allureWrapCustomCommands') === undefined ||
        Cypress.env('allureWrapCustomCommands') === 'true' ||
        Cypress.env('allureWrapCustomCommands') === true
      ) {
        return true;
      }

      if (Cypress.env('allureWrapCustomCommands') === 'false' || Cypress.env('allureWrapCustomCommands') === false) {
        return false;
      }

      return Cypress.env('allureWrapCustomCommands').split(',');
    },
  });
};
