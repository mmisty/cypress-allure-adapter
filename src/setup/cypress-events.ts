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

const convertEmptyObj = (obj: Record<string, unknown>): string => {
  if (obj == null) {
    return 'null';
  }

  if (Object.keys(obj).length > 0) {
    try {
      JSON.stringify(obj);
    } catch (e) {
      return 'could not stringify';
    }
  }

  return '';
};

const stringify = (args: any) => {
  const getArr = () => {
    try {
      if (Array.isArray(args)) {
        return args.map(a => stringify(a)).join(',');
      } else {
        return convertEmptyObj(args);
      }
    } catch (err) {
      return 'could not stringify';
    }
  };

  return typeof args === 'string' || typeof args === 'number' || typeof args === 'boolean' ? `${args}` : getArr();
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

export const handleCyLogEvents = (
  runner: Mocha.Runner,
  config: { wrapCustomCommands: boolean; ignoreCommands: string[] },
) => {
  const { ignoreCommands, wrapCustomCommands } = config;
  const commands: string[] = [];
  const logCommands: string[] = [];
  const emit = createEmitEvent(runner);

  const allureAttachRequests = Cypress.env('allureAttachRequests')
    ? Cypress.env('allureAttachRequests') === 'true' || Cypress.env('allureAttachRequests') === true
    : false;

  const isLogCommand = (isLog: boolean, name: string) => {
    return isLog && !ignoreCommands.includes(name) && !Object.keys(Cypress.Allure).includes(name);
  };

  if (wrapCustomCommands) {
    const origAdd = Cypress.Commands.add;

    Cypress.Commands.add = (...args) => {
      const name = args[0];
      const fn = args[1];
      const other = args.slice(1);

      if (typeof name === 'string') {
        try {
          origAdd(
            name,
            (...fnargs) => {
              const params = stringify(fnargs);
              const cmdMess = stepMessage(name, params);
              console.log(`HERE ${cmdMess}`);
              Cypress.Allure.startStep(cmdMess);
              const res = fn(...fnargs);
              cy.allure().endStep();

              return res;
            },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            ...other,
          );
        } catch (err) {
          console.log(`${packageLog} error: ${(err as Error).message}`);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          origAdd(...args);
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        origAdd(...args);
      }
    };
  }

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
        logName !== 'request'
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
        const longArgs = args.filter(t => t.length >= ARGS_TRIM_AT);

        if (!allureAttachRequests && name !== 'request' && longArgs.length > 0) {
          const content = longArgs.map(a => stringify(a)).join('\n');

          emit({
            task: 'attachment',
            arg: { name: cmdMessage, content, type: ContentType.JSON },
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
