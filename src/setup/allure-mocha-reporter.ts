import Debug from 'debug';
import { createMessage } from './websocket';
import { handleCyLogEvents } from './cypress-events';
import { AllureTransfer, RequestTask, Status } from '../plugins/allure-types'; // todo
import { registerScreenshotHandler } from './screenshots';
import StatusDetails = Cypress.StatusDetails;

const debug = Debug('cypress-allure:mocha-reporter');
// this is running in Browser
const ignoreCommands = ['allure', 'then'];
const TEST_PENDING_DETAILS = 'Test ignored';

const logEvent = (...args: any[]) => {
  if (Cypress.env('DEBUG')) {
    debug.enabled = true;

    // todo log namespace
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      debug(JSON.stringify(...args));
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      debug(...args);
    }
  }
};

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
  GLOBAL_HOOK_PASS: 'global hook pass',
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

export const allureInterface = (
  fn: <T extends RequestTask>(data: AllureTransfer<T> | string) => void,
): Cypress.AllureReporter<void> => {
  return {
    tag: (...tags: string[]) => tags.forEach(tag => fn({ task: 'label', arg: { name: 'tag', value: tag } })),
    label: (name: string, value: string) => fn({ task: 'label', arg: { name, value } }),
    startStep: (name: string) => fn({ task: 'stepStarted', arg: { name } }),
    endStep: () => fn({ task: 'stepEnded', arg: { status: Status.PASSED } }),
    step: (name: string) => fn({ task: 'step', arg: { name, status: 'passed' } }),
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
/*
const allAfters = (s: Mocha.Suite | undefined, res: Hook[] = []): Hook[] => {
  if (!s) {
    return res;
  }
  const extSuite = s as SuiteExtended;
  const curr = extSuite.hooks ? extSuite.hooks.filter(x => x.hookName === 'after each') : [];

  return allAfters(s.parent, [...res, ...curr]);
};

class AfterEachHookManager {
  private currentTestLocal: Mocha.Test | undefined = undefined;
  private afterHooks = 0;
  private currentTestHooksLocal: Hook[] = [];

  get currentTest() {
    return this.currentTestLocal;
  }

  clear() {
    this.afterHooks = 0;
    this.currentTestHooksLocal = [];
    this.currentTestLocal = undefined;
  }

  addStartedAfterEach(hook: Hook) {
    if ((hook as any).hookName === 'after each') {
      this.afterHooks++;
    }
  }

  hasAftersEaches() {
    logEvent(this.currentTestHooksLocal);

    return this.currentTestHooksLocal.length !== 0;
  }

  isLastHook(hook: Hook) {
    return (hook as any).hookName === 'after each' && this.currentTestHooksLocal.length === this.afterHooks;
  }

  setCurrentTestHooks(test: Mocha.Test) {
    this.currentTestLocal = test;
    this.currentTestHooksLocal = allAfters(test.parent);
  }
}
type SuiteExtended = Mocha.Suite & { parent: SuiteExtended; hooks: (Mocha.Hook & { hookName?: string })[] };
*/

export const registerMochaReporter = (ws: WebSocket) => {
  const tests: string[] = [];
  const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;
  runner.setMaxListeners(20);
  //const afterHooks = new AfterEachHookManager();
  const message = createMessage(ws);
  const allureInterfaceInstance = allureInterface(message);
  registerScreenshotHandler(allureInterfaceInstance);
  Cypress.Allure = allureInterfaceInstance;

  const isStartedTest = () => {
    return tests.length > 0;
  };
  runner
    .once(MOCHA_EVENTS.RUN_BEGIN, async () => {
      logEvent(`event ${MOCHA_EVENTS.RUN_BEGIN}`);
      runner.emit('task', { task: 'endAll', arg: {} });
      await message({ task: 'specStarted', arg: { spec: Cypress.spec } });
    })

    .on(MOCHA_EVENTS.SUITE_BEGIN, async suite => {
      logEvent(`event ${MOCHA_EVENTS.SUITE_BEGIN}: ${suite.title} + ${suite.fullTitle()}`);

      if (isRootSuite(suite)) {
        runner.emit('task', { task: 'endAll', arg: {} });

        return;
      }

      await message({
        task: 'suiteStarted',
        arg: { title: suite.title, fullTitle: suite.fullTitle(), file: suite.file },
      });
    })

    .on(MOCHA_EVENTS.HOOK_START, async hook => {
      logEvent(`event ${MOCHA_EVENTS.HOOK_START}: ${hook.title}`);
      //afterHooks.addStartedAfterEach(hook);

      // do not log technical after eaches
      //if (hook.title?.indexOf(TECH_POSTFIX) === -1) {
      await message({
        task: 'hookStarted',
        arg: { title: hook.title, file: hook.file, hookId: hook.hookId },
      });
      //}
    })

    .on(MOCHA_EVENTS.HOOK_END, async hook => {
      logEvent(`event ${MOCHA_EVENTS.HOOK_END}: ${hook.title}`);

      // do not log technical after eaches
      //if (hook.title?.indexOf(TECH_POSTFIX) === -1) {
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

      //if (afterHooks.isLastHook(hook)) {
      //runner.emit(CUSTOM_EVENTS.TEST_END, afterHooks.currentTest);
      //}
    })

    .on(MOCHA_EVENTS.TEST_PENDING, test => {
      logEvent(`event ${MOCHA_EVENTS.TEST_PENDING}: ${test.title}`);

      if (!isStartedTest()) {
        tests.push(test.fullTitle());
        runner.emit(CUSTOM_EVENTS.TEST_BEGIN, test);
      }
    })

    .on(MOCHA_EVENTS.TEST_BEGIN, async (test: Mocha.Test) => {
      logEvent(`event ${MOCHA_EVENTS.TEST_BEGIN}: ${test.title}`);
      logEvent(`${JSON.stringify(tests)}`);

      if (isStartedTest()) {
        // for some reason begin event fires twice when test is skipped by this.skip();
        logEvent('test pending');

        return;
      }

      tests.push(test.fullTitle());
      runner.emit(CUSTOM_EVENTS.TEST_BEGIN, test);
      //afterHooks.clear();
      //afterHooks.setCurrentTestHooks(test);
      // when no hooks use original event
    })

    .on(MOCHA_EVENTS.TEST_FAIL, async (test: Mocha.Test) => {
      logEvent(`event ${MOCHA_EVENTS.TEST_FAIL}: ${test?.title}`);

      if ((test as any).type === 'hook' && (test as any).hookName === 'before all') {
        runner.emit(CUSTOM_EVENTS.HOOK_END, test);
        runner.emit(CUSTOM_EVENTS.GLOBAL_HOOK_FAIL, test);
      } else {
        runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);
      }
    })

    .on(MOCHA_EVENTS.TEST_RETRY, async test => {
      logEvent(`event ${MOCHA_EVENTS.TEST_RETRY}: ${test.title}`);
      runner.emit(CUSTOM_EVENTS.TEST_FAIL, test);

      //if (!afterHooks.hasAftersEaches()) {
      //runner.emit(CUSTOM_EVENTS.TEST_END, test);
      //}
    })

    .on(MOCHA_EVENTS.TEST_PASS, async test => {
      logEvent(`event ${MOCHA_EVENTS.TEST_PASS}: ${test.title}`);

      await message({
        task: 'testResult',
        arg: {
          suite: test.parent?.fullTitle() ?? '',
          title: test.title,
          fullTitle: test.fullTitle(),
          id: test.id,
          result: convertState('passed'),
        },
      });
    })
    .on(MOCHA_EVENTS.TEST_END, test => {
      logEvent(`event ${MOCHA_EVENTS.TEST_END}: ${test.title}`);

      //if (!afterHooks.hasAftersEaches()) {
      //runner.emit(CUSTOM_EVENTS.TEST_END, test);
      // }
    })

    .on(MOCHA_EVENTS.SUITE_END, async suite => {
      logEvent(`event ${MOCHA_EVENTS.SUITE_END}: ${suite.title} ${suite.file}`);

      if (isRootSuite(suite)) {
        return;
      }
      await message({ task: 'suiteEnded', arg: {} });
    })

    .on(MOCHA_EVENTS.RUN_END, async () => {
      logEvent(`event ${MOCHA_EVENTS.RUN_END}`);

      await message('RUN_END');
    });

  // custom events
  runner
    .on(CUSTOM_EVENTS.HOOK_END, async hook => {
      logEvent(`event ${CUSTOM_EVENTS.HOOK_END}: ${hook.title}`);

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
      logEvent(`event ${CUSTOM_EVENTS.GLOBAL_HOOK_FAIL}: ${hook.title}`);
      let i = 0;

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
      logEvent(`event ${CUSTOM_EVENTS.TEST_BEGIN}: ${test.title}`);

      await message({ task: 'testStarted', arg: { title: test.title, fullTitle: test.fullTitle(), id: test.id } });
    })

    .on(CUSTOM_EVENTS.TASK, async payload => {
      logEvent(`event ${CUSTOM_EVENTS.TASK}`);
      logEvent(payload);

      await message(payload);
    })

    .on(CUSTOM_EVENTS.TEST_FAIL, async (test: Mocha.Test) => {
      logEvent(`event ${CUSTOM_EVENTS.TEST_FAIL}: ${test.title}`);
      await message({
        task: 'testResult',
        arg: {
          suite: test.parent?.fullTitle() ?? '',
          title: test.title,
          fullTitle: test.fullTitle(),
          id: (test as any).id,
          result: convertState('failed'),
          details: { message: test.err?.message, trace: test.err?.stack },
        },
      });
    })

    .on(CUSTOM_EVENTS.TEST_END, async test => {
      logEvent(`event ${CUSTOM_EVENTS.TEST_END}: ${test.title}`);

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

  Cypress.on('test:after:run', (_t, test) => {
    runner.emit(CUSTOM_EVENTS.TEST_END, test);
  });

  const ignoreMoreCommands = (Cypress.env('allureSkipCommands') ?? '').split(',');

  handleCyLogEvents(runner, { ignoreCommands: [...ignoreCommands, ...ignoreMoreCommands] });
};
