import type { AllureTransfer } from '../plugins/allure';
import { delay } from 'cypress-redirect-browser-log/utils/functions';
import RequestTask = Cypress.RequestTask;
import { ENV_WS, wsPath } from '../common';

export const startWsClient = (): WebSocket | undefined => {
  const port = Cypress.env(ENV_WS);

  if (!port) {
    console.log('No existing ws server');

    return undefined;
  }

  const wsPathFixed = `${port}/${wsPath}`.replace(/\/\//g, '/');
  const ws = new WebSocket(`ws://localhost:${wsPathFixed}`);
  (Cypress as any).ws = ws;

  ws.onopen = () => {
    ws.send('WS opened');
  };

  Cypress.on('window:before:load', async () => {
    while (ws.readyState !== ws.OPEN) {
      // todo timeout
      await delay(1);
    }
  });

  return ws;
};

export const createMessage =
  (ws: WebSocket) =>
  async <T extends RequestTask>(data: AllureTransfer<T> | string) => {
    while (ws.readyState !== ws.OPEN) {
      // todo timeout
      await delay(1);
    }

    if (typeof data === 'string') {
      ws.send(data);

      return;
    }

    ws.send(JSON.stringify(data));
  };
