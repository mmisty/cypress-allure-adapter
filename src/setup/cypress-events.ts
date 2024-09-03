import { logClient } from './helper';
import { Status } from '../plugins/allure-types';
import { packageLog, swapItems } from '../common';
import type { CommandT } from '../common/command-names';
import { EventEmitter } from 'events';
import {
  ARGS_TRIM_AT,
  COMMAND_REQUEST,
  commandParams,
  filterCommandLog,
  ignoreAllCommands,
  CyLog,
  stepMessage,
  withTry,
  logNameFn,
} from '../common/command-names';
import { FullRequest } from '../common/utils';
import { logRequestEvents } from './request-events';
import { CustomCommandsHandler } from '../setup/custom-commands-handling';
import { Groups } from './group-handling';
import { attachRequests } from './requests-handler';

const dbg = 'cypress-allure:cy-events';
const UNCAUGHT_EXCEPTION_NAME = 'uncaught exception';
const UNCAUGHT_EXCEPTION_STATUS = 'broken' as Status;
const failedStatus = 'failed' as Status;
const passedStatus = 'passed' as Status;
const brokenStatus = 'broken' as Status;

const swapDoSyncCommand = () => {
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
};

export const handleCyLogEvents = (
  runner: Mocha.Runner,
  events: EventEmitter,
  config: {
    wrapCustomCommands: () => boolean | string[];
    ignoreCommands: () => string[];
    allureLogCyCommands: () => boolean;
    spyOnRequests: () => string[];
  },
) => {
  const debug = logClient(dbg);
  const { ignoreCommands, wrapCustomCommands, allureLogCyCommands, spyOnRequests } = config;
  const customCommands: string[] = [];
  const groups = new Groups(events);
  const customCommandsHandler = new CustomCommandsHandler(events, ignoreCommands, wrapCustomCommands);

  const requests: FullRequest[] = [];
  groups.handleGroupsEvents();
  swapDoSyncCommand();
  logRequestEvents(requests, events);

  const allureAttachRequests = Cypress.env('allureAttachRequests')
    ? `${Cypress.env('allureAttachRequests')}` === 'true'
    : false;

  const allureCompactAttachmentsRequests = Cypress.env('allureCompactAttachments')
    ? `${Cypress.env('allureCompactAttachments')}` === 'true'
    : true;

  const isLogCommand = (isLog: boolean, name: string) => {
    return isLog && !ignoreAllCommands(ignoreCommands).includes(name) && !Object.keys(Cypress.Allure).includes(name);
  };

  if (allureLogCyCommands()) {
    customCommandsHandler.wrap();
    // customCommandsHandler.wrapGroupedCommands();
  }

  // should be beforeEach (not before) to get env variable value from test config
  beforeEach(`${packageLog}`, () => {
    // this way can save bodies for intercepted requests

    const requestsToSpy = spyOnRequests?.() ?? [];

    cy.allure().parameter(
      'To access request bodies',
      "add environment variable: `allureAddBodiesToRequests`\n(value is requests split by comma that you wish to save, to save all set '*')",
    );
    cy.allure().parameter(
      'To skip this message',
      "add environment variable `allureSkipSteps: '*\\[cypress-allure-adapter\\]*' `",
    );

    if (requestsToSpy.length > 0) {
      requestsToSpy.forEach(r => {
        cy.intercept(r).as('allure');
      });
    } else {
      // for not using step command
      cy.allure().startStep('will not intercept requests to save bodies');
      cy.allure().endStep();
    }
    requests.splice(0, requests.length);
    groups.resetGroups();
  });

  Cypress.on('log:added', (log: CyLog) => {
    if (!allureLogCyCommands()) {
      return;
    }

    withTry('report log:added', () => {
      const logName = logNameFn(log);
      const logMessage = log.message;
      const chainerId = log.chainerId;
      const end = log.end || log.ended;
      const logState = log.state;
      const groupStart = log.groupStart;

      const cmdMessage = stepMessage(logName, logMessage === 'null' ? '' : logMessage);

      groups.endGroupMayBe('');

      if (chainerId || !end || logName === COMMAND_REQUEST) {
        return;
      }

      // only synchronous logs without parent commands
      if (groupStart) {
        if (groups.startGroupMaybe(cmdMessage)) {
          // only start when no chainer
          return;
        }
      }
      Cypress.Allure.startStep(cmdMessage);

      let status = passedStatus;

      if (logName === 'WARNING') {
        status = brokenStatus;
      }

      if (logState === 'failed') {
        status = failedStatus;
      }

      Cypress.Allure.endStep(status);
    });
  });

  const addCommandLogs = (command: CommandT) => {
    if (!allureLogCyCommands()) {
      return;
    }

    const filtered = filterCommandLog(command, ignoreCommands).sort((aLog, bLog) => {
      const attrA = aLog?.attributes?.commandLogId;
      const attrB = bLog?.attributes?.commandLogId;

      if (!attrA || !attrB) {
        return 0;
      }

      return attrA < attrB ? -1 : 1;
    });

    filtered.forEach(log => {
      const attr = log.attributes;
      const logName = logNameFn(attr);
      const logErr = attr?.error;
      const message = attr?.message;
      const groupStart = attr?.groupStart;
      const logMessage = stepMessage(logName, message === 'null' ? '' : message);

      const getProps = () => {
        if (attr && attr.consoleProps && typeof attr.consoleProps === 'function') {
          return attr.consoleProps();
        }

        if (attr && attr.consoleProps && typeof attr.consoleProps !== 'function') {
          return attr.consoleProps;
        }

        return undefined;
      };

      const consoleProps = getProps();
      // console.log('logName', logName);
      // console.log('logMessage', logMessage);
      // console.log('attr');
      // console.log(attr);
      // console.log('consoleProps');
      // console.log(consoleProps);
      // console.log(groups);

      groups.endGroupMayBe(logMessage);

      if (groupStart) {
        if (groups.startGroupMaybe(logMessage)) {
          return;
        }
      }

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
    events.emit('cmd:ended:tech', command);
  });

  Cypress.on('command:end', (command: CommandT) => {
    events.emit('cmd:ended:tech', command);
  });

  events.on('cmd:started:tech', (command: CommandT, isCustom) => {
    const { message: cmdMessage } = commandParams(command);
    groups.endGroupMayBe();

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

    groups.endGroupMayBe();

    if (!isCustom) {
      // will be added here for all custom or non-custom
      // since cypress ends custom commands right away
      addCommandLogs(command);
    }

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
        attachRequests(dbg, allureAttachRequests, command, { compactAttachments: allureCompactAttachmentsRequests });
      });
    }

    if (!allureLogCyCommands()) {
      return;
    }

    debug(`ended ${isCustom ? 'CUSTOM' : ''}: ${cmdMessage}`);
    Cypress.Allure.endStep(status);
  });
};
