import { delay, ENV_WS, MessageQueue, packageLog, wsPath } from '../common';
import type { AllureTransfer, RequestTask } from '../plugins/allure-types';

const timeout = 5000;

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
  (Cypress as any).ws = ws;

  ws.onopen = () => {
    ws.send('WS opened');
    console.log(`${packageLog} Opened ws connection`);
  };

  Cypress.on('window:load', async () => {
    while (ws.readyState !== ws.OPEN && Date.now() - started < timeout) {
      await delay(1);
    }
  });

  return ws;
};

const messageQueue = new MessageQueue();

export const createMessage = (ws: WebSocket) => {
  return async <T extends RequestTask>(data: AllureTransfer<T> | string) => {
    messageQueue.enqueue(data);
    const started = Date.now();

    while (ws.readyState !== ws.OPEN && Date.now() - started < timeout) {
      await delay(1);

      if (Date.now() - started > timeout) {
        console.log(`${packageLog} Could not connect, will not report!`);

        return;
      }
    }

    const messages = messageQueue.dequeueAll();

    if (!messages) {
      return;
    }
    messages.forEach(msg => {
      ws.send(JSON.stringify(msg));
    });
  };
};
