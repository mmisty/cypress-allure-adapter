import type { AllureTransfer, RequestTask } from '../plugins/allure-types';
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
  isGherkin,
  stepMessage,
  stringify,
  withTry,
} from '../common/command-names';

const dbg = 'cypress-allure:cy-events';

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

  const customCommands: string[] = [];
  const emit = createEmitEvent(runner);

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

  const gherkinLog: { current: string | undefined } = { current: undefined };

  Cypress.Allure.on('test:started', () => {
    gherkinLog.current = undefined;
  });

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
          emit({ task: 'endAllSteps', arg: { status: Status.PASSED } });
        }
        const msg = cmdMessage.replace(/\*\*/g, '');
        Cypress.Allure.startStep(msg);
        gherkinLog.current = msg;

        return;
      }
    });
  });

  const addCommandLogs = (command: CommandT) => {
    if (!allureLogCyCommands()) {
      return;
    }

    filterCommandLog(command, ignoreCommands).forEach((log: any) => {
      const attr = log.attributes;
      const logName = attr.name;
      const cmdMessage = stepMessage(attr.name, attr.message === 'null' ? '' : attr.message);

      // console.log('logName');
      // console.log(logName);
      // console.log('attr');
      // console.log(attr);

      Cypress.Allure.startStep(cmdMessage);

      if (logName !== 'assert' && log.message && log.message.length > ARGS_TRIM_AT) {
        Cypress.Allure.attachment(`${cmdMessage} args`, log.message, 'application/json');
      }

      Cypress.Allure.endStep(attr.err ? 'failed' : 'passed');
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
