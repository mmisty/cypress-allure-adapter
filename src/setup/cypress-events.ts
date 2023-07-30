import type { AllureTransfer, RequestTask } from '../plugins/allure-types';
import { logClient } from './helper';
import { ContentType, Status } from '../plugins/allure-types';
import { packageLog } from '../common';
import Chainable = Cypress.Chainable;
import { EventEmitter } from 'events';
import CommandT = Cypress.CommandT;

const dbg = 'cypress-allure:cy-events';
const ARGS_TRIM_AT = 80;

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
  const argsLine = args && args.length > ARGS_TRIM_AT ? '' : args && args.length > 0 ? `: ${args}` : '';

  return `${name}${argsLine}`;
};

const convertEmptyObj = (obj: Record<string, unknown>, indent?: string): string => {
  if (obj == null) {
    return '';
  }

  if (Object.keys(obj).length > 0) {
    try {
      return !indent ? JSON.stringify(obj) : JSON.stringify(obj, null, indent);
    } catch (e) {
      return 'could not stringify';
    }
  }

  return '';
};

const stringify = (args: any, indent?: string): string => {
  const getArr = () => {
    try {
      if (Array.isArray(args)) {
        return args.map(a => stringify(a, indent)).join(',');
      } else {
        return convertEmptyObj(args, indent);
      }
    } catch (err) {
      return 'could not stringify';
    }
  };

  if (typeof args === 'string') {
    try {
      return stringify(JSON.parse(args), indent);
    } catch (err) {
      return `${args}`;
    }
  }

  return typeof args === 'string' || typeof args === 'number' || typeof args === 'boolean' ? `${args}` : getArr();
};

const requestName = (url: string, method: string) => {
  return `${method}, ${url}`;
};

type OneRequestConsoleProp = {
  'Request Body': any;
  'Request Headers': any;
  'Request URL': string;
  'Response Body'?: any;
  'Response Headers'?: any;
  'Response Status'?: number;
};
const COMMAND_REQUEST = 'request';

const attachRequests = (allureAttachRequests: boolean, command: CommandT, opts: { compactAttachments: boolean }) => {
  const debug = logClient(dbg);
  const maxParamLength = 70;
  const compact = opts.compactAttachments ?? true;
  const indent = compact ? undefined : ' ';
  debug(command);
  const logsAttr = command.attributes?.logs ?? [];
  const consoleProps = logsAttr.map(t => t.attributes?.consoleProps?.());
  debug('consoleProps:');
  debug(consoleProps);

  const logs = consoleProps.filter(t => t.Command === COMMAND_REQUEST);

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

  requests
    .filter(r => !!r)
    .forEach(req => {
      const reqHeaders = { obj: req['Request Headers'], name: 'Request Headers' };
      const reqBody = { obj: req['Request Body'], name: 'Request Body' };
      const resHeaders = { obj: req['Response Headers'], name: 'Response Headers' };
      const resBody = { obj: req['Response Body'], name: 'Response Body' };
      const resStatusParam = { name: 'Response Status', value: `${req['Response Status'] ?? ''}` };
      const reqUrlParam = { name: 'Request URL', value: `${req['Request URL'] ?? ''}` };

      const attaches = [reqBody, reqHeaders, resBody, resHeaders].map(t => ({
        ...t,
        stringified: stringify(t.obj, indent),
      }));

      const shortAttaches = attaches.filter(a => a.stringified.length < maxParamLength);
      const longAttaches = attaches.filter(a => a.stringified.length >= maxParamLength);

      Cypress.Allure.parameters(
        resStatusParam,
        reqUrlParam,
        ...shortAttaches.map(a => ({ name: a.name, value: a.stringified })),
      );

      if (allureAttachRequests) {
        longAttaches
          .filter(t => !!t.obj)
          .forEach(attach => {
            Cypress.Allure.attachment(attach.name, attach.stringified, ContentType.JSON);
          });
      }
    });
};

const commandParams = (command: CommandT) => {
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
        return commandArgs
          .map(arg => {
            if (name === COMMAND_REQUEST && typeof arg === 'object' && arg.method && arg.url) {
              return requestName(arg.url, arg.method);
            }

            return stringify(arg);
          })
          .filter(x => x.trim() !== '');
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
  events: EventEmitter,
  config: { wrapCustomCommands: boolean; ignoreCommands: string[] },
) => {
  const debug = logClient(dbg);
  const { ignoreCommands, wrapCustomCommands } = config;
  const ingoreAllCommands = [...ignoreCommands, 'should', 'then', 'allure'];
  const customCommands: string[] = [];
  const commands: string[] = [];
  const logCommands: string[] = [];
  const emit = createEmitEvent(runner);

  const allureAttachRequests = Cypress.env('allureAttachRequests')
    ? Cypress.env('allureAttachRequests') === 'true' || Cypress.env('allureAttachRequests') === true
    : false;

  const allureCompactAttachmentsRequests = Cypress.env('allureCompactAttachments')
    ? Cypress.env('allureCompactAttachments') === 'true' || Cypress.env('allureCompactAttachments') === true
    : true;

  const isLogCommand = (isLog: boolean, name: string) => {
    return isLog && !ingoreAllCommands.includes(name) && !Object.keys(Cypress.Allure).includes(name);
  };

  const wrapCustomCommandsFn = () => {
    const origAdd = Cypress.Commands.add;

    Cypress.Commands.add = (...args: any[]) => {
      const fnName = args[0];
      const fn = typeof args[1] === 'function' ? args[1] : args[2];
      const opts = typeof args[1] === 'object' ? args[1] : undefined;

      if (!fnName || typeof fnName !== 'string' || ingoreAllCommands.includes(fnName)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        origAdd(...args);

        return;
      }

      const newFn = (...fnargs: any[]) => {
        const currentCmd = (Cypress as any).state?.().current;
        events.emit('cmd:started:tech', currentCmd, true);

        const res = fn(...fnargs);

        if (res?.should) {
          // cannot use cy.allure().endStep() as it will change the subject
          res.should(() => {
            events.emit('cmd:ended:tech', currentCmd, true);
          });
        } else if (!res) {
          // when chain does not return anything
          cy.wrap(null, { log: false }).then(() => {
            events.emit('cmd:ended:tech', currentCmd, true);
          });
        } else {
          // in all other cases end command safely
          events.emit('cmd:ended:tech', currentCmd, true);
        }

        return res;
      };

      if (fn && opts) {
        origAdd(fnName as keyof Chainable, opts, newFn);
      } else if (fn) {
        origAdd(fnName as keyof Chainable, newFn);
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        origAdd(...args);
      }
    };
  };

  if (wrapCustomCommands) {
    wrapCustomCommandsFn();
  }

  Cypress.on('log:added', async log => {
    withTry('report log:added', () => {
      const cmdMessage = stepMessage(log.name, log.message === 'null' ? '' : log.message);
      const logName = log.name;
      const lastCommand = commands[commands.length - 1];
      const lastLogCommand = logCommands[logCommands.length - 1];
      // const isEnded = log.end;

      // logs are being added for all from command log, need to exclude same items
      if (
        cmdMessage !== lastCommand &&
        cmdMessage !== lastLogCommand &&
        !ingoreAllCommands.includes(logName) &&
        logName !== COMMAND_REQUEST
      ) {
        logCommands.push(cmdMessage);
        debug(`step: ${cmdMessage}`);

        Cypress.Allure.startStep(cmdMessage);

        if (log.message > ARGS_TRIM_AT) {
          Cypress.Allure.attachment(cmdMessage, log.message, ContentType.JSON);
        }
        Cypress.Allure.endStep(Status.PASSED);
      }
    });
  });

  Cypress.on('command:start', async (command: CommandT) => {
    events.emit('cmd:started:tech', command);
  });

  Cypress.on('command:end', async (command: CommandT) => {
    events.emit('cmd:ended:tech', command);
  });

  events.on('cmd:started:tech', (command: CommandT, isCustom) => {
    const { message: cmdMessage } = commandParams(command);

    debug(`started tech: ${cmdMessage}`);

    if (isCustom) {
      customCommands.push(cmdMessage);

      // not start when custom because cypress already
      // fired event command:start
      return;
    }

    events.emit('cmd:started', command);
  });

  Cypress.Allure.on('cmd:started', (command: CommandT) => {
    const { name, isLog, message: cmdMessage, args } = commandParams(command);

    if (name === 'screenshot') {
      // add screenshot to report
      const screenName = command.attributes?.args[0] ?? 'anyName';
      emit({ task: 'screenshotOne', arg: { forStep: true, name: screenName } });
    }

    if (!isLogCommand(isLog, name)) {
      return;
    }

    debug(`started: ${cmdMessage}`);
    Cypress.Allure.startStep(cmdMessage);

    commands.push(cmdMessage);

    withTry('report command:attachment', () => {
      const requestAndLogRequests = allureAttachRequests && name === COMMAND_REQUEST;

      if (!requestAndLogRequests && args.join(',').length > ARGS_TRIM_AT) {
        const content = args.join('\n');

        Cypress.Allure.attachment(cmdMessage, content, ContentType.JSON);
      }
    });
  });

  events.on('cmd:ended:tech', (command: CommandT, isCustom) => {
    const { message: cmdMessage } = commandParams(command);

    const last = customCommands[customCommands.length - 1];

    if (last && last === cmdMessage) {
      customCommands.pop();

      // cypress ends custom commands right away
      // not end when custom started
      return;
    }
    events.emit('cmd:ended', command, isCustom);
  });

  Cypress.Allure.on('cmd:ended', (command: CommandT, isCustom) => {
    const { name, isLog, state, message: cmdMessage } = commandParams(command);

    if (!isLogCommand(isLog, name)) {
      return;
    }

    commands.pop();

    if (name === COMMAND_REQUEST) {
      withTry('report attach:requests', () => {
        attachRequests(allureAttachRequests, command, { compactAttachments: allureCompactAttachmentsRequests });
      });
    }

    debug(`ended ${isCustom ? 'CUSTOM' : ''}: ${cmdMessage}`);
    Cypress.Allure.endStep(state);
  });
};
