import type { AllureTransfer, RequestTask } from '../plugins/allure-types';
import Debug from 'debug';
import { logClient } from './helper';
import { ContentType, Status } from '../plugins/allure-types';

const debug = logClient(Debug('cypress-allure:cy-events'));
const ARGS_TRIM_AT = 50;

const stepMessage = (name: string, args: string | undefined) => {
  const argsLine = args && args.length > ARGS_TRIM_AT ? '' : `: ${args}`;

  return `${name}${argsLine}`;
};

const convertEmptyObj = (obj: Record<string, unknown>): string =>
  obj == null ? 'null' : Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';

const stringify = (args: any) => {
  return typeof args === 'string' || typeof args === 'number' || typeof args === 'boolean'
    ? `${args}`
    : convertEmptyObj(args);
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
      return false; // 'could not get log';
    }
  };

  const getArgs = (): string[] => {
    try {
      if (Array.isArray(commandArgs)) {
        return commandArgs.map(t => stringify(t)).filter(x => x.trim() !== '');
      }

      return [convertEmptyObj(commandArgs)];
    } catch (err) {
      return ['could not parse args'];
    }
  };
  const args = getArgs();

  return {
    name,
    args,
    message: stepMessage(name, args.filter(t => t.length < ARGS_TRIM_AT).join(', ')),
    isLog: isLog(),
    state,
  };
};

const createEmitEvent =
  (runner: Mocha.Runner) =>
  <T extends RequestTask>(args: AllureTransfer<T>) => {
    runner.emit('task', args);
  };

export const handleCyLogEvents = (runner: Mocha.Runner, config: { ignoreCommands: string[] }) => {
  const { ignoreCommands } = config;
  const commands: string[] = [];
  const logCommands: string[] = [];
  const emit = createEmitEvent(runner);

  const isLogCommand = (isLog: boolean, name: string) => {
    return isLog && !ignoreCommands.includes(name) && !Object.keys(Cypress.Allure).includes(name);
  };

  Cypress.on('log:added', async log => {
    const cmdMessage = stepMessage(log.name, log.message);
    const logName = log.name;
    const lastCommand = commands[commands.length - 1];
    const lastLogCommand = logCommands[logCommands.length - 1];
    // const isEnded = log.end;

    // logs are being added for all from command log, need to exclude same items
    if (cmdMessage !== lastCommand && cmdMessage !== lastLogCommand && !ignoreCommands.includes(logName)) {
      logCommands.push(cmdMessage);
      debug(`step: ${cmdMessage}`);
      emit({ task: 'stepStarted', arg: { name: cmdMessage, date: Date.now() } });

      if (cmdMessage.length > ARGS_TRIM_AT) {
        emit({ task: 'attachment', arg: { name: cmdMessage, content: cmdMessage, type: ContentType.JSON } });
      }
      emit({ task: 'stepEnded', arg: { status: Status.PASSED, date: Date.now() } });
    }
  });

  Cypress.on('command:start', async command => {
    const { name, message: cmdMessage, isLog, args } = commandParams(command);

    if (isLogCommand(isLog, name)) {
      debug(`started: ${cmdMessage}`);
      commands.push(cmdMessage);
      emit({ task: 'stepStarted', arg: { name: cmdMessage, date: Date.now() } });

      if (args.some(t => t.length > ARGS_TRIM_AT)) {
        emit({
          task: 'attachment',
          arg: {
            name: cmdMessage,
            content: args
              .filter(t => t.length >= ARGS_TRIM_AT)
              .map(a => stringify(a))
              .join('\n'),
            type: ContentType.JSON,
          },
        });
      }
    }

    if (name === 'screenshot') {
      const screenName = command.attributes.args[0] ?? 'anyName';
      emit({ task: 'screenshotOne', arg: { forStep: true, name: screenName } });
    }
  });

  Cypress.on('command:end', async command => {
    const { name, isLog, state } = commandParams(command);

    if (isLogCommand(isLog, name)) {
      const cmd = commands.pop();
      debug(`ended: ${cmd}`);
      emit({ task: 'stepEnded', arg: { status: state, date: Date.now() } });
    }
  });
};
