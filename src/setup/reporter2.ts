import Status = Cypress.Status;
import { createMessage } from './websocket';

const log = (...args: unknown[]) => {
  console.log(`[reporter-2] ${args}`);
};

const MOCHA_EVENTS = {
  RUN_BEGIN: 'start',
  SUITE_BEGIN: 'suite',
  TEST_BEGIN: 'test',
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

export const registerMochaReporter = (ws: WebSocket) => {
  const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;
  const stats: Mocha.Stats | undefined = runner.stats;
  const message = createMessage(ws);

  runner
    .once(MOCHA_EVENTS.RUN_BEGIN, async () => {
      log('event start');
      await message('event start');
      await message({ task: 'specStarted', arg: { spec: Cypress.spec } });
    })
    .on(MOCHA_EVENTS.SUITE_BEGIN, async suite => {
      await message({
        task: 'suiteStarted',
        arg: { title: suite.title, fullTitle: suite.fullTitle(), file: suite.file },
      });
    })
    .on(CUSTOM_EVENTS.TASK, async payload => {
      await message(payload);
    })
    .on(MOCHA_EVENTS.TEST_BEGIN, async test => {
      await message({ task: 'testStarted', arg: { title: test.title, fullTitle: test.fullTitle(), id: test.id } });
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
    .on(MOCHA_EVENTS.SUITE_END, async () => {
      await message({ task: 'suiteEnded', arg: {} });
    })
    .on(MOCHA_EVENTS.RUN_END, async () => {
      await message('RUN_END');
    });

  afterEach(function (this: Mocha.Context) {
    console.log('AFTER');
    const test = this.currentTest;

    if (test) {
      cy.wrap(null, { log: false }).then(() => {
        runner.emit(CUSTOM_EVENTS.TEST_END, test);
      });
    }
  });

  let currentCommand = '';
  const ignoreCommands = ['allure', 'then', 'wrap'];

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
          return !commandArgs.some(a => a.log === false);
        }

        return commandArgs.log !== false;
      } catch (err) {
        return 'could not parse args';
      }
    };

    const getArgs = () => {
      const convertEmptyObj = (obj: Record<string, unknown>) =>
        Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';

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

  Cypress.on('log:added', async (log, args) => {
    const cmdMessage = stepMessage(log.name, log.message);
    // const logId = log.id
    // const isEnded = log.end;

    // logs are being added for all from command log, need to exclude same items

    if (
      cmdMessage !== currentCommand &&
      log.url !== 'http://localhost:3000/__cypress/messages' &&
      !ignoreCommands.includes(log.name)
    ) {
      // if (isEnded) {
      //   runner.emit('task', { task: 'step', arg: { name: cmdMessage } });
      // }
      runner.emit('task', { task: 'step', arg: { name: cmdMessage } });
    }
  });

  Cypress.on('command:start', async command => {
    const { name, message: cmdMessage, isLog } = commandParams(command);

    if (isLog && !ignoreCommands.includes(name)) {
      currentCommand = cmdMessage;
      runner.emit('task', { task: 'stepStarted', arg: { name: cmdMessage } });
    }

    if (name === 'screenshot') {
      const screenName = command.attributes.args[0] ?? 'anyName';
      runner.emit('task', { task: 'screenshotOne', arg: { forStep: true, name: screenName } });
    }
  });

  Cypress.on('command:end', async command => {
    const { name, isLog, state } = commandParams(command);

    if (isLog && !ignoreCommands.includes(name)) {
      runner.emit('task', { task: 'stepEnded', arg: { status: state } });
    }
  });
};
