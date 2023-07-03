import Status = Cypress.Status;
import { createMessage } from './websocket';

const commands: string[] = [];
//const ignoreCommands = ['allure', 'then', 'wrap'];
const ignoreCommands = ['allure', 'then'];

const log = (...args: unknown[]) => {
  console.log(`[reporter-2] ${args}`);
};

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
      log('event start');
      await message('event start');
      runner.emit('task', { task: 'endAll', arg: {} });
      await message({ task: 'specStarted', arg: { spec: Cypress.spec } });
      await message({
        task: 'suiteStarted',
        arg: { title: '', fullTitle: '', file: Cypress.spec.absolute },
      });
    })
    .on(MOCHA_EVENTS.SUITE_BEGIN, async suite => {
      /* if (isRootSuite(suite)) {
        return;
      }*/
      await message({
        task: 'suiteStarted',
        arg: { title: suite.title, fullTitle: suite.fullTitle(), file: suite.file },
      });
    })
    .on(MOCHA_EVENTS.HOOK_START, async hook => {
      if (hook.title.indexOf('(skip)') !== -1) {
        // do not log technical after eachs
        return;
      }
      await message({
        task: 'hookStarted',
        arg: { title: hook.title, file: hook.file, hookId: hook.hookId },
      });
    })
    .on(MOCHA_EVENTS.HOOK_END, async hook => {
      await message({ task: 'hookEnded', arg: { title: hook.title } });
    })

    .on(CUSTOM_EVENTS.TASK, async payload => {
      await message(payload);
    })
    .on(MOCHA_EVENTS.TEST_BEGIN, async test => {
      await message({ task: 'testStarted', arg: { title: test.title, fullTitle: test.fullTitle(), id: test.id } });
    })
    .on(MOCHA_EVENTS.TEST_FAIL, async () => {
      await message({ task: 'testResult', arg: { result: convertState('failed') } });
    })
    .on(MOCHA_EVENTS.TEST_PASS, async () => {
      await message({ task: 'testResult', arg: { result: convertState('passed') } });
    })
    .on(MOCHA_EVENTS.TEST_END, test => {
      // after each is not called for pending tests
      if (test.state === 'pending') {
        runner.emit(CUSTOM_EVENTS.TEST_END, test);
      }
    })
    .on(CUSTOM_EVENTS.TEST_END, async test => {
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
      console.log('suite.file');
      console.log(suite.file);

      if (isRootSuite(suite)) {
        return;
      }
      await message({ task: 'suiteEnded', arg: {} });
    })
    .on(MOCHA_EVENTS.RUN_END, async () => {
      await message('RUN_END');
    });

  // after each is not called when pending test
  afterEach(function (this: Mocha.Context) {
    console.log('AFTER');
    const test = this.currentTest;

    if (this.test) {
      // this is technical hook
      this.test.title = `${this.test.title}(skip)`;
    }

    if (test) {
      cy.wrap(null, { log: false }).then(() => {
        runner.emit(CUSTOM_EVENTS.TEST_END, test);
      });
    }
  });

  const stepMessage = (name: string, args: string) => {
    return `${name}: ${args}`;
  };

  const commandParams = (command: any) => {
    const name = command.attributes.name;
    const commandArgs = command.attributes.args as any;
    const state = command.state;

    // exclude command logs with Cypress options isLog = false
    const isLog = () => {
      try {
        if (Array.isArray(commandArgs)) {
          return !commandArgs.some(a => a && a.log === false);
        }

        return commandArgs.log !== false;
      } catch (err) {
        return 'could not get log';
      }
    };

    const getArgs = () => {
      const convertEmptyObj = (obj: Record<string, unknown>) =>
        obj == null ? 'null' : Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';

      try {
        if (Array.isArray(commandArgs)) {
          return commandArgs
            .map(t => (typeof t === 'string' ? t : convertEmptyObj(t)))
            .filter(t => t.trim() !== '')
            .join(', ');
        }

        return convertEmptyObj(commandArgs);
      } catch (err) {
        return 'could not parse args';
      }
    };

    return {
      name,
      message: stepMessage(name, getArgs()),
      isLog: isLog(),
      state,
    };
  };
  const currentLog: string[] = [];

  Cypress.on('log:added', async log => {
    const cmdMessage = stepMessage(log.name, log.message);
    const logName = log.name;
    const logId = log.id;
    const isEnded = log.end;

    // logs are being added for all from command log, need to exclude same items

    if (
      cmdMessage !== commands[commands.length - 1] &&
      log.url !== 'http://localhost:3000/__cypress/messages' &&
      !ignoreCommands.includes(logName)
    ) {
      if (!isEnded) {
        currentLog.push(logId);
        runner.emit('task', { task: 'step', arg: { name: cmdMessage } });
      } else {
        runner.emit('task', { task: 'step', arg: { name: cmdMessage } });
      }
    }
  });

  /* Cypress.on('log:changed', async log => {
    const cmdMessage = stepMessage(log.name, log.message);
    const logId = log.id;
    const isEnded = log.ended;
    const status = log.state;

    if (
      isEnded &&
      currentLog.includes(logId) &&
      log.url !== 'http://localhost:3000/__cypress/messages' &&
      !ignoreCommands.includes(log.name)
    ) {
      runner.emit('task', { task: 'step', arg: { name: cmdMessage, status } });
      currentLog.pop();
    }
  });*/

  Cypress.on('command:start', async command => {
    const { name, message: cmdMessage, isLog } = commandParams(command);

    if (isLog && !ignoreCommands.includes(name)) {
      commands.push(cmdMessage);
      runner.emit('task', { task: 'stepStarted', arg: { name: cmdMessage } });
    }

    if (name === 'screenshot') {
      const screenName = command.attributes.args[0] ?? 'anyName';
      runner.emit('task', { task: 'screenshotOne', arg: { forStep: true, name: screenName } });
    }
  });
  /*Cypress.on('skipped:command:end', async command => {
    console.log('skipped:command:end');
    console.log(command);
  });
*/
  Cypress.on('command:enqueued', async command => {
    console.log('command:enqueued');
    console.log(command.name);
    console.log(command);
  });

  Cypress.on('command:end', async command => {
    console.log(command);
    const { name, isLog, state } = commandParams(command);

    if (isLog && !ignoreCommands.includes(name)) {
      runner.emit('task', { task: 'stepEnded', arg: { status: state } });
      commands.pop();
    }

    /* if (state !== 'passed') {
      runner.emit('task', { task: 'step', arg: { status: state } });
    }*/
  });
};
