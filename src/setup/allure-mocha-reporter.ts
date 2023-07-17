import Debug from 'debug';
import { createMessage } from './websocket';
import { handleCyLogEvents } from './cypress-events';
import {
  AllureTransfer,
  EnvironmentInfo,
  ExecutorInfo,
  RequestTask,
  Status,
  Category,
  LabelName,
} from '../plugins/allure-types'; // todo
import { registerScreenshotHandler } from './screenshots';
import StatusDetails = Cypress.StatusDetails;
import { logClient, delay } from './helper';
import { tmsIssueUrl } from '../common';
import { EventEmitter } from 'events';
import AllureEvents = Cypress.AllureEvents;

const debug = logClient(Debug('cypress-allure:mocha-reporter'));
// this is running in Browser
const ignoreCommands = ['allure', 'then'];
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
    if (isStub && ![USER_EVENTS.TEST_START, USER_EVENTS.TEST_END].includes(event)) {
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
    writeCategoriesDefinitions: (categories: Category[]) =>
      fn({ task: 'writeCategoriesDefinitions', arg: { categories } }),
    startStep: (name: string) => fn({ task: 'stepStarted', arg: { name, date: Date.now() } }),
    endStep: () => fn({ task: 'stepEnded', arg: { status: Status.PASSED, date: Date.now() } }),
    step: (name: string) => fn({ task: 'step', arg: { name, status: 'passed', date: Date.now() } }),
    deleteResults: () => fn({ task: 'deleteResults', arg: {} }),
    fullName: (value: string) => fn({ task: 'fullName', arg: { value } }),
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
    tms: (url: string, name?: string) =>
      fn({ task: 'link', arg: { url: tmsIssueUrl(env, url, 'tms'), name, type: 'tms' } }),
    issue: (url: string, name?: string) =>
      fn({ task: 'link', arg: { url: tmsIssueUrl(env, url, 'issue'), name, type: 'issue' } }),
    label: (name: string, value: string) => fn({ task: 'label', arg: { name, value } }),
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
  return (test as any).type === 'hook' && (test as any).hookName === 'before all';
};

const isBeforeEachHook = (test: Mocha.Test) => {
  return (test as any).type === 'hook' && (test as any).hookName === 'before each';
};

const createTests = (runner: Mocha.Runner, test: Mocha.Test) => {
  let index = 0;
  test.parent?.eachTest(ts => {
    index++;

    ts.err = test.err;

    if (ts) {
      runner.emit(CUSTOM_EVENTS.TEST_BEGIN, ts);
      runner.emit(CUSTOM_EVENTS.TEST_FAIL, ts);

      if (index !== 1) {
        // end all except first
        // first test will be ended in cy event with proper message
        runner.emit(CUSTOM_EVENTS.TEST_END, ts);
      }
    }
  });
};

export const registerMochaReporter = (ws: WebSocket) => {
  const tests: string[] = [];
  const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;
  runner.setMaxListeners(20);
  const messageManager = createMessage(ws);
  const message = messageManager.message;
  allureEventsEmitter.removeAllListeners();

  const allureInterfaceInstance = allureInterface(Cypress.env(), message);
  const allureEvents = eventsInterfaceInstance(false);
  registerScreenshotHandler(allureInterfaceInstance);
  Cypress.Allure = { ...allureInterfaceInstance, ...allureEvents };
  const startedSuites: Mocha.Suite[] = [];
  let runEnded = true;

  runner
    .once(MOCHA_EVENTS.RUN_BEGIN, () => {
      runEnded = false;
      debug(`event ${MOCHA_EVENTS.RUN_BEGIN}`);
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'endAll', arg: {} });
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'specStarted', arg: { spec: Cypress.spec } });
      messageManager.process();
    })

    .on(MOCHA_EVENTS.SUITE_BEGIN, suite => {
      debug(`event ${MOCHA_EVENTS.SUITE_BEGIN}: ${suite.title} + ${suite.fullTitle()}`);

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

    .on(MOCHA_EVENTS.SUITE_END, suite => {
      debug(`event ${MOCHA_EVENTS.SUITE_END}: ${suite.title} ${suite.file}`);

      if (startedSuites.length === 1) {
        // will end later with run end
        return;
      }

      if (isRootSuite(suite)) {
        runner.emit(CUSTOM_EVENTS.TASK, { task: 'globalHook', arg: {} });

        return;
      }
      startedSuites.pop();
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'suiteEnded', arg: {} });
    })

    .on(MOCHA_EVENTS.HOOK_START, hook => {
      debug(`event ${MOCHA_EVENTS.HOOK_START}: ${hook.title}`);

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
      debug(`event ${MOCHA_EVENTS.HOOK_END}: ${hook.title}`);

      if (isBeforeAllHook(hook) && isRootSuiteTest(hook)) {
        debug('GLOBAL BEFORE ALL - end all existing ');
        runner.emit(CUSTOM_EVENTS.TASK, { task: 'endAll', arg: {} });
      }

      runner.emit(CUSTOM_EVENTS.TASK, {
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

    .on(MOCHA_EVENTS.TEST_PENDING, test => {
      debug(`event ${MOCHA_EVENTS.TEST_PENDING}: ${test.title}`);
      // ignore
    })

    .on(MOCHA_EVENTS.TEST_BEGIN, (test: Mocha.Test) => {
      debug(`event ${MOCHA_EVENTS.TEST_BEGIN}: ${test.title}`);
      debug(`${JSON.stringify(tests)}`);
      // ignore
    })

    .on(MOCHA_EVENTS.TEST_FAIL, (test: Mocha.Test) => {
      debug(`event ${MOCHA_EVENTS.TEST_FAIL}: ${test?.title}`);

      if (isBeforeEachHook(test)) {
        runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);

        // hook end not fired when hook fails
        runner.emit(CUSTOM_EVENTS.HOOK_END, test);

        // when before each fails all tests are skipped in current suite
        createTests(runner, test);

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
        createTests(runner, test);

        return;
      }

      runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);

      // hook end not fired when hook fails
      runner.emit(CUSTOM_EVENTS.HOOK_END, test);

      return;
    })

    .on(MOCHA_EVENTS.TEST_RETRY, test => {
      debug(`event ${MOCHA_EVENTS.TEST_RETRY}: ${test.title}`);
      runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);
    })

    .on(MOCHA_EVENTS.TEST_PASS, test => {
      debug(`event ${MOCHA_EVENTS.TEST_PASS}: ${test.title}`);

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
    })

    .on(MOCHA_EVENTS.RUN_END, () => {
      debug(`event ${MOCHA_EVENTS.RUN_END}: tests length ${tests.length}`);

      runEnded = true;
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'suiteEnded', arg: {} });
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'message', arg: { name: 'RUN_END' } });

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
      let i = 0;

      message({ task: 'endAll', arg: {} });

      for (const sui of hook.parent?.suites) {
        runner.emit(MOCHA_EVENTS.SUITE_BEGIN, sui);

        sui.eachTest((test: Mocha.Test) => {
          i++;

          if (test) {
            runner.emit(CUSTOM_EVENTS.TEST_BEGIN, test);
            runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);
            runner.emit(CUSTOM_EVENTS.TEST_END, i === 1 ? hook : { ...test, err: hook.err });
          }
        });

        runner.emit(MOCHA_EVENTS.SUITE_END, sui);
      }
    })

    .on(CUSTOM_EVENTS.TEST_BEGIN, test => {
      debug(`event ${CUSTOM_EVENTS.TEST_BEGIN}: ${test.title}`);

      message({ task: 'testStarted', arg: { title: test.title, fullTitle: test.fullTitle(), id: test.id } });

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

  Cypress.on('test:before:run', async (_t, test) => {
    const started = Date.now();

    // cypress test:before:run event fires for first test in suite along with
    // before hook event, need to wait until suite starts
    while (startedSuites.length === 0 && !runEnded && Date.now() - started < Cypress.config('defaultCommandTimeout')) {
      await delay(1);
    }

    runner.emit(CUSTOM_EVENTS.TEST_BEGIN, test);
    runner.emit(CUSTOM_EVENTS.TASK, { task: 'message', arg: { name: `******** test:before:run=${test.title}` } });
  });

  Cypress.on('test:after:run', (_t, test) => {
    runner.emit(CUSTOM_EVENTS.TEST_END, test);
    runner.emit(CUSTOM_EVENTS.TASK, { task: 'message', arg: { name: `******** test:after:run=${test.title}` } });
  });

  const ignoreMoreCommands = (Cypress.env('allureSkipCommands') ?? '').split(',');

  handleCyLogEvents(runner, { ignoreCommands: [...ignoreCommands, ...ignoreMoreCommands] });
};
