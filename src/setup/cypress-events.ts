import type { AllureTransfer, RequestTask } from '../plugins/allure-types';
import Debug from 'debug';
import { logClient } from './helper';

const debug = logClient(Debug('cypress-allure:cy-events'));

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
      return false; // 'could not get log';
    }
  };

  const getArgs = () => {
    const convertEmptyObj = (obj: Record<string, unknown>) =>
      obj == null ? 'null' : Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';

    try {
      if (Array.isArray(commandArgs)) {
        return commandArgs
          .map(t =>
            typeof t === 'string' || typeof t === 'number' || typeof t === 'boolean' ? `${t}` : convertEmptyObj(t),
          )
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
      emit({ task: 'step', arg: { name: cmdMessage, date: Date.now() } });
    }
  });

  Cypress.on('command:start', async command => {
    const { name, message: cmdMessage, isLog } = commandParams(command);

    if (isLogCommand(isLog, name)) {
      debug(`started: ${cmdMessage}`);
      commands.push(cmdMessage);
      emit({ task: 'stepStarted', arg: { name: cmdMessage, date: Date.now() } });
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
