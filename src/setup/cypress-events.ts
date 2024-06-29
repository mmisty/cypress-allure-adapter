import type { AllureTransfer, RequestTask } from '../plugins/allure-types';
import { logClient } from './helper';
import { Status } from '../plugins/allure-types';
import { baseUrlFromUrl, packageLog, swapItems } from '../common';
import Chainable = Cypress.Chainable;
import { EventEmitter } from 'events';
import CommandT = Cypress.CommandT;

const dbg = 'cypress-allure:cy-events';
const ARGS_TRIM_AT = 200;

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
  const argsLine =
    args && args.length > ARGS_TRIM_AT && name !== 'assert' ? '' : args && args.length > 0 ? `: ${args}` : '';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  'Request Body': unknown;
  'Request Headers': unknown;
  'Request URL': string;
  'Response Body'?: unknown;
  'Response Headers'?: unknown;
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

  // t.Command for less than 13.x cypress
  const logs = consoleProps.filter(t => t.name === COMMAND_REQUEST || t.Command === COMMAND_REQUEST);

  const getRequests = (): OneRequestConsoleProp[] | undefined => {
    const logsMapped = logs.map(t => t.props ?? t); // support  cypress < 13.x

    if (logsMapped.every(t => !!t.Requests)) {
      // several requests if there are come redirects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return logsMapped.flatMap(t => t.Requests.map((x: any) => ({ ...x, duration: t.Yielded?.duration })));
    }

    if (logsMapped.every(t => !!t.Request)) {
      return logsMapped.map(t => ({ ...t.Request, duration: t.Yielded?.duration }));
    }

    return undefined;
  };

  const requests = getRequests();

  if (!requests) {
    return;
  }
  const allRequests = requests.filter(r => !!r);
  allRequests.forEach((req: OneRequestConsoleProp) => {
    const reqHeaders = { obj: req['Request Headers'], name: 'Request Headers' };
    const reqBody = { obj: req['Request Body'], name: 'Request Body' };
    const resHeaders = { obj: req['Response Headers'], name: 'Response Headers' };
    const resBody = { obj: req['Response Body'], name: 'Response Body' };
    const resStatusParam = { name: 'Response Status', value: `${req['Response Status'] ?? ''}` };
    const reqUrlParam = { name: 'Request URL', value: `${req['Request URL'] ?? ''}` };

    const stepUrl = reqUrlParam.value.replace(
      Cypress.config('baseUrl') ?? baseUrlFromUrl(Cypress.config('browserUrl') ?? '') ?? '',
      '',
    );
    const stepStatus = resStatusParam.value !== '200' ? 'broken' : 'passed';

    /*if (reqNumber === 0) {
      Cypress.Allure.parameters({ name: 'duration', value: req.duration });
    }*/

    if (allRequests.length > 1) {
      Cypress.Allure.startStep(`request: ${resStatusParam.value} ${stepUrl}`);
    }

    const attaches = [reqBody, reqHeaders, resBody, resHeaders].map(t => ({
      ...t,
      stringified: stringify(t.obj, indent),
    }));

    const shortAttaches = attaches.filter(a => a.stringified.length < maxParamLength);
    const longAttaches = attaches.filter(a => a.stringified.length >= maxParamLength);

    if (allRequests.length === 1) {
      Cypress.Allure.parameters(resStatusParam);
    }

    Cypress.Allure.parameters(reqUrlParam, ...shortAttaches.map(a => ({ name: a.name, value: a.stringified })));

    if (allureAttachRequests) {
      longAttaches
        .filter(t => !!t.obj)
        .forEach(attach => {
          Cypress.Allure.attachment(attach.name, attach.stringified, 'application/json');
        });
    }

    if (allRequests.length > 1) {
      Cypress.Allure.endStep(stepStatus);
    }
  });
};

const commandParams = (command: CommandT) => {
  const name = command.attributes?.name ?? 'no name';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  config: {
    wrapCustomCommands: () => boolean | string[];
    ignoreCommands: () => string[];
    allureLogCyCommands: () => boolean;
  },
) => {
  const debug = logClient(dbg);
  const { ignoreCommands, wrapCustomCommands, allureLogCyCommands } = config;

  const ignoreAllCommands = () => {
    const cmds = [...ignoreCommands(), 'should', 'then', 'allure', 'doSyncCommand']
      .filter(t => t.trim() !== '')
      .map(x => new RegExp(`^${x.replace(/\*/g, '.*')}$`));

    return {
      includes(ttl: string): boolean {
        return cmds.some(t => t.test(ttl));
      },
    };
  };

  const customCommands: string[] = [];
  const allLogged: string[] = [];
  const emit = createEmitEvent(runner);

  Cypress.Allure.on('test:started', () => {
    allLogged.splice(0, allLogged.length);
  });

  const allureAttachRequests = Cypress.env('allureAttachRequests')
    ? Cypress.env('allureAttachRequests') === 'true' || Cypress.env('allureAttachRequests') === true
    : false;

  const allureCompactAttachmentsRequests = Cypress.env('allureCompactAttachments')
    ? Cypress.env('allureCompactAttachments') === 'true' || Cypress.env('allureCompactAttachments') === true
    : true;

  const isLogCommand = (isLog: boolean, name: string) => {
    return isLog && !ignoreAllCommands().includes(name) && !Object.keys(Cypress.Allure).includes(name);
  };

  const wrapCustomCommandsFn = (commands: string[], isExclude: boolean) => {
    const origAdd = Cypress.Commands.add;

    Cypress.on('command:enqueued', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queue = () => (cy as any).queue as any;

      // swap if next chainer is 'should'
      // should be done for all child commands ?
      const swapCmd = () => {
        const custId = queue().queueables.findIndex(
          (t: CommandT, i: number) => i >= queue().index && t.attributes?.name === 'doSyncCommand',
        );
        const next = custId + 1;

        if (queue().queueables.length > next && ['assertion'].includes(queue().queueables[next].attributes.type)) {
          swapItems(queue().queueables, custId, next);
          swapCmd();
        }
      };
      swapCmd();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cypress.Commands.add = (...args: any[]) => {
      const fnName = args[0];
      const fn = typeof args[1] === 'function' ? args[1] : args[2];
      const opts = typeof args[1] === 'object' ? args[1] : undefined;

      if (
        !fnName ||
        typeof fnName !== 'string' ||
        ignoreAllCommands().includes(fnName) ||
        // wrap only specified commands
        (commands.length > 0 && commands.includes(fnName) && isExclude) ||
        (commands.length > 0 && !commands.includes(fnName) && !isExclude)
      ) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        origAdd(...args);

        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newFn = (...fnargs: any[]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentCmd = (Cypress as any).state?.().current;
        events.emit('cmd:started:tech', currentCmd, true);

        const res = fn(...fnargs);
        const end = () => events.emit('cmd:ended:tech', currentCmd, true);

        if (res?.then && !res?.should) {
          // for promises returned from commands
          res.then(() => {
            end();
          });
        } else {
          cy.doSyncCommand(() => {
            end();
          });
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

  const wrapCustomCommandsRes = wrapCustomCommands();

  if (allureLogCyCommands() && wrapCustomCommandsRes) {
    const commands = Array.isArray(wrapCustomCommandsRes) ? wrapCustomCommandsRes : [];
    let isExclude = false;
    let commadsFixed = commands;

    if (!commands?.every(c => c.startsWith('!')) || !commands?.every(c => !c.startsWith('!'))) {
      console.warn('wrapCustomCommands env var - should either all start from "!" or not');
    }

    if (commands?.every(c => c.startsWith('!'))) {
      isExclude = true;
      commadsFixed = commands?.map(t => t.slice(1));
    }

    wrapCustomCommandsFn(commadsFixed, isExclude);
  }

  const isGherkin = (logName: string) => {
    return logName && ['When', 'Given', 'Then', 'And', 'After', 'Before'].some(t => logName.startsWith(t));
  };

  const failed: { name: string; message: string }[] = [];
  const gherkinLog: { current: string | undefined } = { current: undefined };

  Cypress.Allure.on('test:started', () => {
    failed.splice(0, failed.length);
    gherkinLog.current = undefined;
  });

  // Cypress.on('log:changed', (log: any) => {
  //   if (!allureLogCyCommands()) {
  //     return;
  //   }
  //
  //   if (log.state !== 'passed') {
  //     failed.push({ name: `${log.name}`, message: log.message });
  //   }
  //
  //   if (log.ended === true && isGherkin(log.name)) {
  //     const status = failed.length !== 0 ? Status.FAILED : log.state;
  //     emit({ task: 'endAllSteps', arg: { status } });
  //
  //     if (failed.length > 0) {
  //       failed.pop();
  //     }
  //   }
  // });

  Cypress.on('log:added', log => {
    if (!allureLogCyCommands()) {
      return;
    }

    withTry('report log:added', () => {
      const cmdMessage = stepMessage(log.name, log.message === 'null' ? '' : log.message);
      const logName = log.name;

      if (isGherkin(logName)) {
        if (gherkinLog.current) {
          // gherkins step should be parent all the time
          emit({ task: 'endAllSteps', arg: { status: failed.length !== 0 ? Status.FAILED : Status.PASSED } });
        }
        const msg = cmdMessage.replace(/\*\*/g, '');
        Cypress.Allure.startStep(msg);
        gherkinLog.current = msg;

        return;
      }
    });
  });

  Cypress.on('command:start', (command: CommandT) => {
    events.emit('cmd:started:tech', command);
  });

  const addLogs = (command: CommandT) => {
    if (!allureLogCyCommands()) {
      return;
    }

    const cmdAttrs = command?.attributes as any;

    (cmdAttrs?.logs as any[])
      ?.filter(log => {
        const attr = log.attributes;
        const logName = attr.name;

        const cmdMsg = commandParams(command)?.message;
        const logMessage = stepMessage(attr.name, attr.message === 'null' ? '' : attr.message);

        // when same args and name for log and current command or when gherkin - do not show
        return !(cmdAttrs?.name === attr.name && logMessage === cmdMsg) && !isGherkin(logName);
      })
      .forEach((log: any) => {
        const attr = log.attributes;
        const logName = attr.name;
        const cmdMessage = stepMessage(attr.name, attr.message === 'null' ? '' : attr.message);

        // console.log('logName');
        // console.log(logName);
        // console.log('attr');
        // console.log(attr);

        if (
          !cmdMessage.match(/its:\s*\..*/) && // its already logged as command
          !ignoreAllCommands().includes(logName) &&
          logName !== COMMAND_REQUEST
        ) {
          Cypress.Allure.startStep(cmdMessage);

          if (logName !== 'assert' && log.message && log.message.length > ARGS_TRIM_AT) {
            Cypress.Allure.attachment(`${cmdMessage} args`, log.message, 'application/json');
          }

          Cypress.Allure.endStep(attr.err ? 'failed' : 'passed');
        }
      });
  };

  Cypress.on('command:failed', (command: CommandT) => {
    addLogs(command);
    events.emit('cmd:ended:tech', command);
  });

  Cypress.on('command:end', (command: CommandT) => {
    addLogs(command);
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

    if (!isLogCommand(isLog, name) || !allureLogCyCommands()) {
      return;
    }

    debug(`started: ${cmdMessage}`);
    Cypress.Allure.startStep(cmdMessage);

    allLogged.push(cmdMessage);

    withTry('report command:attachment', () => {
      const requestAndLogRequests = allureAttachRequests && name === COMMAND_REQUEST;

      if (!requestAndLogRequests && args.join(',').length > ARGS_TRIM_AT) {
        const content = args.join('\n');

        Cypress.Allure.attachment(`${cmdMessage} args`, content, 'application/json');
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

    if (name === COMMAND_REQUEST) {
      withTry('report attach:requests', () => {
        attachRequests(allureAttachRequests, command, { compactAttachments: allureCompactAttachmentsRequests });
      });
    }

    if (!allureLogCyCommands()) {
      return;
    }
    debug(`ended ${isCustom ? 'CUSTOM' : ''}: ${cmdMessage}`);
    Cypress.Allure.endStep(state);
  });
};
