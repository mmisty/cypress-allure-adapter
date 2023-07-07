import Debug from 'debug';
import { createMessage } from './websocket';
import { handleCyLogEvents } from './cypress-events';
import { AllureTransfer, RequestTask, Status } from '../plugins/allure-types'; // todo
import { registerScreenshotHandler } from './screenshots';
import StatusDetails = Cypress.StatusDetails;
import { logClient, delay } from './helper';

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

export const allureInterface = (
  fn: <T extends RequestTask>(data: AllureTransfer<T> | string) => void,
): Cypress.AllureReporter<void> => {
  return {
    tag: (...tags: string[]) => tags.forEach(tag => fn({ task: 'label', arg: { name: 'tag', value: tag } })),
    label: (name: string, value: string) => fn({ task: 'label', arg: { name, value } }),
    startStep: (name: string) => fn({ task: 'stepStarted', arg: { name, date: Date.now() } }),
    endStep: () => fn({ task: 'stepEnded', arg: { status: Status.PASSED, date: Date.now() } }),
    step: (name: string) => fn({ task: 'step', arg: { name, status: 'passed', date: Date.now() } }),
    severity: (level: Cypress.Severity) => fn({ task: 'severity', arg: { level } }),
    language: (value: string) => fn({ task: 'language', arg: { value } }),
    link: (url: string, name?: string, type?: 'issue' | 'tms') => fn({ task: 'link', arg: { url, name, type } }),
    host: (value: string) => fn({ task: 'host', arg: { value } }),
    fullName: (value: string) => fn({ task: 'fullName', arg: { value } }),
    testAttachment: (name: string, content: string | Buffer, type) =>
      fn({ task: 'testAttachment', arg: { name, content, type } }),
    testStatus: (result: Status, details?: StatusDetails) => fn({ task: 'testStatus', arg: { result, details } }),
    testDetails: (details?: StatusDetails) => fn({ task: 'testDetails', arg: { details } }),
    testFileAttachment: (name: string, file: string, type) =>
      fn({ task: 'testFileAttachment', arg: { name, file, type } }),
    attachment: (name: string, content: string | Buffer, type) =>
      fn({ task: 'attachment', arg: { name, content, type } }),
    owner: (value: string) => fn({ task: 'owner', arg: { value } }),
    lead: (value: string) => fn({ task: 'lead', arg: { value } }),
    feature: (value: string) => fn({ task: 'feature', arg: { value } }),
    story: (value: string) => fn({ task: 'story', arg: { value } }),
    epic: (value: string) => fn({ task: 'epic', arg: { value } }),
    allureId: (value: string) => fn({ task: 'allureId', arg: { value } }),
    thread: (value: string) => fn({ task: 'thread', arg: { value } }),
    parameter: (name: string, value: string) => fn({ task: 'parameter', arg: { name, value } }),
    parameters: (...params: Cypress.Parameter[]) =>
      params.forEach(p => fn({ task: 'parameter', arg: { name: p.name, value: p.value } })),
    testParameter(name: string, value: string): void {
      fn({ task: 'testParameter', arg: { name, value } });
    },
    addDescriptionHtml(value: string): void {
      fn({ task: 'addDescriptionHtml', arg: { value } });
    },
  };
};

export const registerStubReporter = () => {
  Cypress.Allure = allureInterface(() => {
    // do nothing when no allure reporting enabled
  });
};

const isBeforeAllHook = (test: Mocha.Test) => {
  return (test as any).type === 'hook' && (test as any).hookName === 'before all';
};

export const registerMochaReporter = (ws: WebSocket) => {
  const tests: string[] = [];
  const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;
  runner.setMaxListeners(20);
  const messageManager = createMessage(ws);
  const message = messageManager.message;

  const allureInterfaceInstance = allureInterface(message);
  registerScreenshotHandler(allureInterfaceInstance);
  Cypress.Allure = allureInterfaceInstance;
  const startedSuites: Mocha.Suite[] = [];
  let runEnded = true;

  runner
    .once(MOCHA_EVENTS.RUN_BEGIN, async () => {
      runEnded = false;
      debug(`event ${MOCHA_EVENTS.RUN_BEGIN}`);
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'endAll', arg: {} });
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'specStarted', arg: { spec: Cypress.spec } });
      messageManager.process();
    })

    .on(MOCHA_EVENTS.SUITE_BEGIN, async suite => {
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

    .on(MOCHA_EVENTS.SUITE_END, async suite => {
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

    .on(MOCHA_EVENTS.HOOK_START, async hook => {
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

    .on(MOCHA_EVENTS.HOOK_END, async hook => {
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

    .on(MOCHA_EVENTS.TEST_BEGIN, async (test: Mocha.Test) => {
      debug(`event ${MOCHA_EVENTS.TEST_BEGIN}: ${test.title}`);
      debug(`${JSON.stringify(tests)}`);
      // ignore
    })

    .on(MOCHA_EVENTS.TEST_FAIL, async (test: Mocha.Test) => {
      debug(`event ${MOCHA_EVENTS.TEST_FAIL}: ${test?.title}`);

      if (!isBeforeAllHook(test)) {
        runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);

        return;
      }
      // hook end not fired when hook fails
      runner.emit(CUSTOM_EVENTS.HOOK_END, test);

      if (isRootSuiteTest(test)) {
        // only for root suite
        runner.emit(CUSTOM_EVENTS.GLOBAL_HOOK_FAIL, test);

        return;
      }

      let index = 0;
      test.parent?.eachTest(ts => {
        index++;

        if (ts) {
          runner.emit(CUSTOM_EVENTS.TEST_BEGIN, index === 1 ? test : ts);
          runner.emit(CUSTOM_EVENTS.TEST_FAIL, ts);
          runner.emit(CUSTOM_EVENTS.TEST_END, index === 1 ? test : { ...ts, err: test.err });
        }
      });
    })

    .on(MOCHA_EVENTS.TEST_RETRY, async test => {
      debug(`event ${MOCHA_EVENTS.TEST_RETRY}: ${test.title}`);
      runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);
    })

    .on(MOCHA_EVENTS.TEST_PASS, async test => {
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

    .on(MOCHA_EVENTS.RUN_END, async () => {
      debug(`event ${MOCHA_EVENTS.RUN_END}`);
      runEnded = true;
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'suiteEnded', arg: {} });
      runner.emit(CUSTOM_EVENTS.TASK, { task: 'message', arg: { name: 'RUN_END' } });

      messageManager.stop();
    });

  // custom events
  runner
    .on(CUSTOM_EVENTS.HOOK_END, async hook => {
      debug(`event ${CUSTOM_EVENTS.HOOK_END}: ${hook.title}`);

      await message({
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

    .once(CUSTOM_EVENTS.GLOBAL_HOOK_FAIL, async hook => {
      debug(`event ${CUSTOM_EVENTS.GLOBAL_HOOK_FAIL}: ${hook.title}`);
      let i = 0;

      await message({ task: 'endAll', arg: {} });

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

    .on(CUSTOM_EVENTS.TEST_BEGIN, async test => {
      debug(`event ${CUSTOM_EVENTS.TEST_BEGIN}: ${test.title}`);

      await message({ task: 'testStarted', arg: { title: test.title, fullTitle: test.fullTitle(), id: test.id } });
    })

    .on(CUSTOM_EVENTS.TASK, async payload => {
      debug(`event ${CUSTOM_EVENTS.TASK}`);
      debug(payload);

      await message(payload);
    })

    .on(CUSTOM_EVENTS.TEST_FAIL, async (test: Mocha.Test) => {
      debug(`event ${CUSTOM_EVENTS.TEST_FAIL}: ${test.title}`);
      await message({
        task: 'testResult',
        arg: {
          title: test?.title,
          id: (test as any)?.id,
          result: convertState('failed'),
          details: { message: test?.err?.message, trace: test?.err?.stack },
        },
      });
    })

    .on(CUSTOM_EVENTS.TEST_END, async test => {
      debug(`event ${CUSTOM_EVENTS.TEST_END}: ${test.title}`);

      tests.pop();
      const detailsErr = test.err as Error;
      const testState = convertState(test.state);
      const detailsMessage = (msg?: string) => (!msg && testState === 'skipped' ? TEST_PENDING_DETAILS : msg);

      await message({
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

  Cypress.on('test:after:run', async (_t, test) => {
    runner.emit(CUSTOM_EVENTS.TEST_END, test);
    runner.emit(CUSTOM_EVENTS.TASK, { task: 'message', arg: { name: `******** test:after:run=${test.title}` } });
  });

  const ignoreMoreCommands = (Cypress.env('allureSkipCommands') ?? '').split(',');

  handleCyLogEvents(runner, { ignoreCommands: [...ignoreCommands, ...ignoreMoreCommands] });
};
