import type { AllureTasks, AllureTransfer, RequestTask } from '../plugins/allure-types';
import Debug from 'debug';
import { logClient } from './helper';
import { ContentType, Status } from '../plugins/allure-types';
import { packageLog } from '../common';

const debug = logClient(Debug('cypress-allure:cy-events'));
const ARGS_TRIM_AT = 100;

const withTry = (message: string, callback: () => void) => {
  try {
    callback();
  } catch (err) {
    const e = err as Error;
    console.error(`${packageLog} could do '${message}': ${e.message}`);
    console.error(e.stack);
  }
};

const stepMessage = (name: string, args: string | undefined) => {
  const argsLine = args && args.length > ARGS_TRIM_AT ? '' : `: ${args}`;

  return `${name}${argsLine}`;
};
type Command = { state?: string; attributes?: { name?: string; args?: any } };

const convertEmptyObj = (obj: Record<string, unknown>): string =>
  obj == null ? 'null' : Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';

const stringify = (args: any) => {
  return typeof args === 'string' || typeof args === 'number' || typeof args === 'boolean'
    ? `${args}`
    : convertEmptyObj(args);
};

const attachRequests = (
  emit: <T extends keyof AllureTasks>(args: AllureTransfer<T>) => void,
  command: any,
  state: Status,
) => {
  debug(command);
  debug('consoleProps:');
  const logsAttr = command.attributes.logs as any[];
  debug(logsAttr.map(t => t.attributes.consoleProps()));

  type OneRequestConsoleProp = {
    'Request Body': any;
    'Request Headers': any;
    'Request URL': string;
    'Response Body'?: any;
    'Response Headers'?: any;
    'Response Status'?: number;
  };

  const logs = logsAttr.map(t => t.attributes.consoleProps()).filter(t => t.Command === 'request');

  const getRequests = (): OneRequestConsoleProp[] | undefined => {
    if (logs.every(t => !!t.Requests)) {
      return logs.flatMap(t => t.Requests);
    }

    if (logs.every(t => !!t.Request)) {
      return logs.map(t => t.Request);
    }

    return undefined;
  };

  const requests = getRequests();

  if (!requests) {
    return;
  }

  requests.forEach(t => {
    if (!t) {
      return;
    }

    emit({
      task: 'stepStarted',
      arg: { name: `${t['Response Status'] ?? ''} ${t['Request URL'] ?? ''}`, date: Date.now() },
    });

    if (t['Request Body']) {
      emit({
        task: 'attachment',
        arg: { name: 'Request body', content: stringify(t['Request Body']), type: ContentType.JSON },
      });
    }

    if (t['Request Headers']) {
      emit({
        task: 'attachment',
        arg: { name: 'Request headers', content: stringify(t['Request Headers']), type: ContentType.JSON },
      });
    }

    if (t['Response Body']) {
      emit({
        task: 'attachment',
        arg: { name: 'Response body', content: stringify(t['Response Body']), type: ContentType.JSON },
      });
    }

    if (t['Response Headers']) {
      emit({
        task: 'attachment',
        arg: {
          name: 'Response Headers',
          content: stringify(t['Response Headers']),
          type: ContentType.JSON,
        },
      });
    }
    emit({ task: 'stepEnded', arg: { status: state, date: Date.now() } });
  });
};

const commandParams = (command: Command) => {
  const name = command.attributes?.name ?? 'no name';
  const commandArgs = command.attributes?.args as any;
  const state = (command.state ?? Status.PASSED) as Status;

  // exclude command logs with Cypress options isLog = false
  const isLog = () => {
    try {
      if (commandArgs && Array.isArray(commandArgs)) {
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

  const allureAttachRequests = Cypress.env('allureAttachRequests')
    ? Cypress.env('allureAttachRequests') === 'true' || Cypress.env('allureAttachRequests') === true
    : false;

  const isLogCommand = (isLog: boolean, name: string) => {
    return isLog && !ignoreCommands.includes(name) && !Object.keys(Cypress.Allure).includes(name);
  };

  Cypress.on('log:added', async log => {
    withTry('report log:added', () => {
      const cmdMessage = stepMessage(log.name, log.message);
      const logName = log.name;
      const lastCommand = commands[commands.length - 1];
      const lastLogCommand = logCommands[logCommands.length - 1];
      // const isEnded = log.end;

      // logs are being added for all from command log, need to exclude same items
      if (
        cmdMessage !== lastCommand &&
        cmdMessage !== lastLogCommand &&
        !ignoreCommands.includes(logName) &&
        !['request'].includes(logName)
      ) {
        logCommands.push(cmdMessage);
        debug(`step: ${cmdMessage}`);
        emit({ task: 'stepStarted', arg: { name: cmdMessage, date: Date.now() } });

        if (cmdMessage.length > ARGS_TRIM_AT) {
          emit({ task: 'attachment', arg: { name: cmdMessage, content: cmdMessage, type: ContentType.JSON } });
        }
        emit({ task: 'stepEnded', arg: { status: Status.PASSED, date: Date.now() } });
      }
    });
  });

  Cypress.on('command:start', async (command: Command) => {
    const { name, message: cmdMessage, isLog, args } = commandParams(command);

    if (isLogCommand(isLog, name)) {
      debug(`started: ${cmdMessage}`);
      commands.push(cmdMessage);

      emit({ task: 'stepStarted', arg: { name: cmdMessage, date: Date.now() } });

      withTry('report command:attachment', () => {
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
      });
    }

    if (name === 'screenshot') {
      const screenName = command.attributes?.args[0] ?? 'anyName';
      emit({ task: 'screenshotOne', arg: { forStep: true, name: screenName } });
    }
  });

  Cypress.on('command:end', async (command: Command) => {
    const { name, isLog, state } = commandParams(command);

    if (isLogCommand(isLog, name)) {
      const cmd = commands.pop();

      if (allureAttachRequests && name === 'request') {
        withTry('report attach:requests', () => {
          attachRequests(emit, command, state);
        });
      }
      debug(`ended: ${cmd}`);
      emit({ task: 'stepEnded', arg: { status: state, date: Date.now() } });
    }
  });
};
