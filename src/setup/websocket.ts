import { ENV_WS, MessageQueue, logWithPackage, packageLog, wsPath } from '../common';
import type { AllureTransfer, RequestTask } from '../plugins/allure-types';
import { logClient } from './helper';

const dbg = 'cypress-allure:ws-client';
const PROCESS_INTERVAL_MS = 10;

function safeSend(ws: WebSocket | undefined, data: string | Buffer) {
  try {
    if (!ws) return;

    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    } else {
      logWithPackage('warn', 'socket not open; dropping message');
    }
  } catch (err) {
    logWithPackage('warn', `safeSend error ${JSON.stringify(err)}`);
  }
}

export const startWsClient = (): WebSocket | undefined => {
  const debug = logClient(dbg);
  const port = Cypress.env(ENV_WS);

  if (!port) {
    logWithPackage(
      'log',
      'No existing ws server started. Will not report to allure. Set "allure" env variable to "true" to generate allure-results',
    );

    return undefined;
  }

  const wsPathFixed = `${port}/${wsPath}`.replace(/\/\//g, '/');
  const ws = new WebSocket(`ws://localhost:${wsPathFixed}`);

  ws.onopen = () => {
    safeSend(ws, 'WS opened');
    debug(`${packageLog} Opened ws connection`);
  };

  return ws;
};

const messageQueue = new MessageQueue();
export type MessageManager = {
  stop: () => void;
  process: () => void;
  message: <T extends RequestTask>(data: AllureTransfer<T> | string) => void;
};

export const createMessage = (ws: WebSocket): MessageManager => {
  let idInterval: number | NodeJS.Timeout | undefined;

  const process = () => {
    const debug = logClient(dbg);

    if (ws.readyState !== ws.OPEN) {
      debug('ws connection is not opened yet');

      return;
    }
    const messages = messageQueue.dequeueAll();

    if (!messages || messages.length === 0) {
      return;
    }

    debug(`processing events ${messages.length}:`);
    messages.forEach(msg => {
      debug(`${msg.data?.task} : ${msg.data?.arg?.title ?? msg.data?.arg?.name}`);
    });
    debug('---');
    messages.forEach(msg => {
      safeSend(ws, JSON.stringify(msg));
    });
  };

  ws.onclose = () => {
    // process last events
    process();

    if (idInterval) {
      clearInterval(idInterval);
    }
  };

  ws.onerror = ev => {
    logWithPackage('error', `Ws error ${ev}`);
  };

  return {
    stop: () => {
      // process last events
      process();

      if (idInterval) {
        clearInterval(idInterval);
      }
    },
    process: () => {
      // process initial events
      process();
      idInterval = setInterval(process, PROCESS_INTERVAL_MS);
    },

    message: <T extends RequestTask>(data: AllureTransfer<T> | string) => {
      messageQueue.enqueue(data); // todo add date time for every event
    },
  };
};
