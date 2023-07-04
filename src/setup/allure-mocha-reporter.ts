import Status = Cypress.Status;
import { createMessage } from './websocket';
import { Hook } from 'mocha';
import { handleCyLogEvents } from './cypress-events';
import Debug from 'debug';

const debug = Debug('cypress-allure:mocha-reporter');
// this is running in Browser
// const debugEvent = Debug('cypress-allure:mocha-event');
const ignoreCommands = ['allure', 'then'];

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

export const TECH_POST_FIX = '(skip)';

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
  SUITE_END: 'suite end',
  RUN_END: 'end',
};

const CUSTOM_EVENTS = {
  TEST_END: 'test end allure',
  TASK: 'task',
  GLOBAL_HOOK_FAIL: 'global hook fail',
};

const convertState = (state: string): Status => {
  if (state === 'pending') {
    return 'skipped';
  }

  return state as Status;
};

const isRootSuite = (suite: Mocha.Suite) => {
  return suite.fullTitle() === '';
};

export const registerMochaReporter = (ws: WebSocket) => {
  const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;
  const message = createMessage(ws);

  runner
    .once(MOCHA_EVENTS.RUN_BEGIN, async () => {
      logEvent(`event ${MOCHA_EVENTS.RUN_BEGIN}`);
      runner.emit('task', { task: 'endAll', arg: {} });
      await message({ task: 'specStarted', arg: { spec: Cypress.spec } });
    })

    .on(MOCHA_EVENTS.SUITE_BEGIN, async suite => {
      logEvent(`event ${MOCHA_EVENTS.SUITE_BEGIN}`);
      logEvent(`name ${suite.title} + ${suite.fullTitle()}`);

      if (isRootSuite(suite)) {
        runner.emit('task', { task: 'endAll', arg: {} });
      }

      await message({
        task: 'suiteStarted',
        arg: { title: suite.title, fullTitle: suite.fullTitle(), file: suite.file },
      });
    })

    .on(MOCHA_EVENTS.HOOK_START, async hook => {
      logEvent(`event ${MOCHA_EVENTS.HOOK_START}`);
      logEvent(`name ${hook.title}`);

      if (hook.title?.indexOf(TECH_POST_FIX) !== -1) {
        // do not log technical after eaches
        return;
      }
      await message({
        task: 'hookStarted',
        arg: { title: hook.title, file: hook.file, hookId: hook.hookId },
      });
    })

    .on(CUSTOM_EVENTS.GLOBAL_HOOK_FAIL, async hook => {
      logEvent(`event ${CUSTOM_EVENTS.GLOBAL_HOOK_FAIL}`);
      logEvent(`name ${hook.title}`);

      let i = 0;
      hook.parent?.suites.forEach(sui => {
        let title;
        sui.eachTest(test => {
          i++;
          title = i === 1 ? test.parent?.fullTitle() : title;
          message({
            task: 'testResult',
            arg: {
              suite: title,
              title: test.title,
              fullTitle: test.fullTitle(),
              id: (test as any).id,
              result: i === 1 ? 'failed' : 'skipped',
              details: { message: hook.err?.message, trace: hook.err?.stack },
            },
          });
        });
      });
    })

    .on(MOCHA_EVENTS.HOOK_END, async hook => {
      logEvent(`event ${MOCHA_EVENTS.HOOK_END}`);
      logEvent(`name ${hook.title}`);

      if (hook.title?.indexOf(TECH_POST_FIX) !== -1) {
        // do not log technical after eaches
        return;
      }
      await message({
        task: 'hookEnded',
        arg: {
          title: hook.title,
          result: hook.state,
          details: {
            message: hook.err?.message,
            trace: hook.err?.stack,
          },
        },
      });
    })

    .on(CUSTOM_EVENTS.TASK, async payload => {
      logEvent(`event ${CUSTOM_EVENTS.TASK}`);
      logEvent(payload);

      await message(payload);
    })

    .on(MOCHA_EVENTS.TEST_BEGIN, async test => {
      logEvent(`event ${MOCHA_EVENTS.TEST_BEGIN}`);
      logEvent(test.title);

      await message({ task: 'testStarted', arg: { title: test.title, fullTitle: test.fullTitle(), id: test.id } });
    })

    .on(MOCHA_EVENTS.TEST_FAIL, async (test: Mocha.Test) => {
      logEvent(`event ${MOCHA_EVENTS.TEST_FAIL}`);
      logEvent(test.title);

      if ((test as any).type === 'hook' && (test as any).hookName === 'before all') {
        runner.emit(CUSTOM_EVENTS.GLOBAL_HOOK_FAIL, test);
      } else {
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
      }
    })

    .on(MOCHA_EVENTS.TEST_RETRY, async test => {
      logEvent(`event ${MOCHA_EVENTS.TEST_RETRY}`);
      logEvent(test.title);
      logEvent('PARENT');
      logEvent(test.parent);

      await message({
        task: 'testResult',
        arg: {
          suite: test.parent?.fullTitle() ?? '',
          title: test.title,
          fullTitle: test.fullTitle(),
          id: test.id,
          result: convertState('failed'),
          details: { message: test.err?.message, trace: test.err?.stack },
        },
      });
    })

    .on(MOCHA_EVENTS.TEST_PASS, async test => {
      logEvent(`event ${MOCHA_EVENTS.TEST_PASS}`);
      logEvent(test.title);

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
      logEvent(`event ${MOCHA_EVENTS.TEST_END}`);
      logEvent(test.title);

      // after each is not called for pending tests
      if (test.state === 'pending') {
        runner.emit(CUSTOM_EVENTS.TEST_END, test);
      }
    })

    .on(CUSTOM_EVENTS.TEST_END, async test => {
      logEvent(`event ${CUSTOM_EVENTS.TEST_END}`);
      logEvent(test.title);

      const detailsErr = test.err as Error;

      await message({
        task: 'testEnded',
        arg: {
          result: convertState(test.state),
          details: {
            message: detailsErr?.message,
            trace: detailsErr?.stack,
          },
        },
      });
    })

    .on(MOCHA_EVENTS.SUITE_END, async suite => {
      logEvent(`event ${MOCHA_EVENTS.SUITE_END}`);
      logEvent(suite.title);
      logEvent(suite.file);

      // if (isRootSuite(suite)) {
      //   return;
      // }
      await message({ task: 'suiteEnded', arg: {} });
    })
    .on(MOCHA_EVENTS.RUN_END, async () => {
      logEvent(`event ${MOCHA_EVENTS.RUN_END}`);

      await message('RUN_END');
    });

  runner.suite.on('afterEach', (hook: Hook) => {
    // technical hook
    hook.title = `${hook.title}${TECH_POST_FIX}`;
  });

  // after each is not called when pending test
  afterEach(function (this: Mocha.Context) {
    const test = this.currentTest;

    if (test) {
      // need to send event that test ended after all after eaches,
      // so test will be written correctly
      cy.wrap(null, { log: false }).then(() => {
        runner.emit(CUSTOM_EVENTS.TEST_END, test);
      });
    }
  });

  const ignoreMoreCommands = (Cypress.env('allureSkipCommands') ?? '').split(',');

  handleCyLogEvents(runner, { ignoreCommands: [...ignoreCommands, ...ignoreMoreCommands] });
};
