import { logClient } from './helper';
import { Status } from '../plugins/allure-types';
import { baseUrlFromUrl, swapItems } from '../common';
import type { CommandT } from '../common/command-names';
import Chainable = Cypress.Chainable;
import { EventEmitter } from 'events';
import {
  ARGS_TRIM_AT,
  COMMAND_REQUEST,
  commandParams,
  filterCommandLog,
  ignoreAllCommands,
  CyLog,
  stepMessage,
  stringify,
  withTry,
} from '../common/command-names';

const dbg = 'cypress-allure:cy-events';
const UNCAUGHT_EXCEPTION_NAME = 'uncaught exception';
const UNCAUGHT_EXCEPTION_STATUS = 'broken' as Status;
const failedStatus = 'failed' as Status;
const passedStatus = 'passed' as Status;
const brokenStatus = 'broken' as Status;

type OneRequestConsoleProp = {
  'Request Body': unknown;
  'Request Headers': unknown;
  'Request URL': string;
  'Response Body'?: unknown;
  'Response Headers'?: unknown;
  'Response Status'?: number;
};

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
      stringified: stringify(t.obj, true, indent),
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

  const customCommands: string[] = [];

  const allureAttachRequests = Cypress.env('allureAttachRequests')
    ? Cypress.env('allureAttachRequests') === 'true' || Cypress.env('allureAttachRequests') === true
    : false;

  const allureCompactAttachmentsRequests = Cypress.env('allureCompactAttachments')
    ? Cypress.env('allureCompactAttachments') === 'true' || Cypress.env('allureCompactAttachments') === true
    : true;

  const isLogCommand = (isLog: boolean, name: string) => {
    return isLog && !ignoreAllCommands(ignoreCommands).includes(name) && !Object.keys(Cypress.Allure).includes(name);
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
        ignoreAllCommands(ignoreCommands).includes(fnName) ||
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

  Cypress.on('log:added', (log: CyLog) => {
    if (!allureLogCyCommands()) {
      return;
    }

    withTry('report log:added', () => {
      const logName = log.name ?? 'no-log-name';
      const logMessage = log.message;
      const chainerId = log.chainerId;
      const end = log.end || log.ended;
      const logState = log.state;

      const cmdMessage = stepMessage(logName, logMessage === 'null' ? '' : logMessage);

      // console.log('log added');
      // console.log(log);

      if (log.groupStart || log.groupEnd) {
        if (log.groupStart) {
          const msg = cmdMessage.replace(/\*\*/g, '');
          Cypress.Allure.startStep(msg);
        }

        if (log.groupEnd) {
          Cypress.Allure.endStep();
        }

        return;
      }

      if (!chainerId && end) {
        // synchronous log without commands
        Cypress.Allure.startStep(cmdMessage);

        let status = passedStatus;

        if (logName === 'WARNING') {
          status = brokenStatus;
        }

        if (logState === 'failed') {
          status = failedStatus;
        }

        Cypress.Allure.endStep(status);
      }
    });
  });

  const addCommandLogs = (command: CommandT) => {
    if (!allureLogCyCommands()) {
      return;
    }

    filterCommandLog(command, ignoreCommands)
      .sort((aLog, bLog) => {
        const attrA = aLog?.attributes?.commandLogId;
        const attrB = bLog?.attributes?.commandLogId;

        if (!attrA || !attrB) {
          return 0;
        }

        return attrA < attrB ? -1 : 1;
      })
      .forEach(log => {
        const attr = log.attributes;
        const logName = attr?.name ?? 'no name';
        const logErr = attr?.error;
        const message = attr?.message;
        const logMessage = stepMessage(logName, message === 'null' ? '' : message);
        const consoleProps = attr?.consoleProps?.();

        // console.log('logName');
        // console.log(logName);
        // console.log('attr');
        // console.log(attr);
        // console.log('consoleProps');
        // console.log(consoleProps);

        Cypress.Allure.startStep(logMessage);

        if (logName !== 'assert' && message && message.length > ARGS_TRIM_AT) {
          Cypress.Allure.attachment(`${logMessage} args`, message, 'application/json');
        }

        let state: Status = consoleProps?.error ?? logErr ? failedStatus : passedStatus;
        let details: { message?: string; trace?: string } | undefined = undefined;

        if (logName.indexOf(UNCAUGHT_EXCEPTION_NAME) !== -1) {
          const err = consoleProps?.props?.Error as Error | undefined;
          const isCommandFailed = command.state === 'failed';
          // when command failed we mark uncaught exception log as error,
          // in other cases it will be marked as broken
          state = isCommandFailed ? failedStatus : UNCAUGHT_EXCEPTION_STATUS;
          details = { message: err?.message, trace: err?.stack };
        }

        if (logName === 'WARNING') {
          state = brokenStatus;
        }

        Cypress.Allure.endStep(state, details);
      });
  };

  Cypress.on('command:start', (command: CommandT) => {
    events.emit('cmd:started:tech', command);
  });

  Cypress.on('command:failed', (command: CommandT) => {
    addCommandLogs(command);
    events.emit('cmd:ended:tech', command);
  });

  Cypress.on('command:end', (command: CommandT) => {
    addCommandLogs(command);
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
    const status = state as Status;

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
    Cypress.Allure.endStep(status);
  });
};
