import Debug from 'debug';
import { ENV_WS, MessageQueue, packageLog, wsPath } from '../common';
import type { AllureTransfer, RequestTask } from '../plugins/allure-types';
import { logClient, delay } from './helper';

const debug = logClient(Debug('cypress-allure:ws-client'));
const CONNECTION_TIMEOUT_MS = 10000;
const PROCESS_INTERVAL_MS = 10;

export const startWsClient = (): WebSocket | undefined => {
  const port = Cypress.env(ENV_WS);

  if (!port) {
    console.log(
      `${packageLog} No existing ws server started. Will not report to allure. Set "allure" env variable to "true" to generate allure-results`,
    );

    return undefined;
  }

  const started = Date.now();
  const wsPathFixed = `${port}/${wsPath}`.replace(/\/\//g, '/');
  const ws = new WebSocket(`ws://localhost:${wsPathFixed}`);

  ws.onopen = () => {
    ws.send('WS opened');
    debug(`${packageLog} Opened ws connection`);
  };

  Cypress.on('window:load', async () => {
    while (ws.readyState !== ws.OPEN && Date.now() - started < CONNECTION_TIMEOUT_MS) {
      await delay(1);
    }
  });

  return ws;
};

const messageQueue = new MessageQueue();
export type MessageManager = {
  stop: () => void;
  process: () => void;
  message: <T extends RequestTask>(data: AllureTransfer<T> | string) => void;
};

export const createMessage = (ws: WebSocket): MessageManager => {
  let idInterval: NodeJS.Timer;

  const process = () => {
    if (ws.readyState !== ws.OPEN) {
      debug('ws connection is not opened yet');

      return;
    }
    const messages = messageQueue.dequeueAll();

    if (!messages || messages.length === 0) {
      return;
    }

    debug(`processing events ${messages?.length}:`);
    messages.forEach(msg => {
      debug(`${msg.data?.task} : ${msg.data?.arg?.title ?? msg.data?.arg?.name}`);
    });
    debug('---');
    messages.forEach(msg => {
      ws.send(JSON.stringify(msg));
    });
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

      ws.onclose = () => {
        if (idInterval) {
          clearInterval(idInterval);
        }
      };

      ws.onerror = ev => {
        console.error(`${packageLog} Ws error ${ev}`);
      };
    },
  };
};
