import Status = Cypress.Status;
import { createMessage } from './websocket';
import { Hook } from 'mocha';
import { handleCyLogEvents } from './cypress-events';

// this is running in Browser
// const debugEvent = Debug('cypress-allure:mocha-event');
const ignoreCommands = ['allure', 'then'];

const logEvent = (...args: unknown[]) => {
  console.log(args);
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
  TEST_END: 'test end',
  SUITE_END: 'suite end',
  RUN_END: 'end',
};

const CUSTOM_EVENTS = {
  TEST_END: 'test end allure',
  TASK: 'task',
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

        return;
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

    .on(MOCHA_EVENTS.HOOK_END, async hook => {
      logEvent(`event ${MOCHA_EVENTS.HOOK_END}`);
      logEvent(`name ${hook.title}`);

      if (hook.title?.indexOf(TECH_POST_FIX) !== -1) {
        // do not log technical after eaches
        return;
      }
      await message({ task: 'hookEnded', arg: { title: hook.title } });
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

    .on(MOCHA_EVENTS.TEST_FAIL, async test => {
      logEvent(`event ${MOCHA_EVENTS.TEST_FAIL}`);
      logEvent(test.title);

      await message({ task: 'testResult', arg: { result: convertState('failed') } });
    })

    .on(MOCHA_EVENTS.TEST_PASS, async test => {
      logEvent(`event ${MOCHA_EVENTS.TEST_PASS}`);
      logEvent(test.title);

      await message({ task: 'testResult', arg: { result: convertState('passed') } });
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

      if (isRootSuite(suite)) {
        return;
      }
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
