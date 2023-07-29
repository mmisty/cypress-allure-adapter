import WebSocket, { WebSocketServer } from 'ws';
import { consoleMock } from '../../mocks/console-mock';
import { existsSync, rmSync } from 'fs';

jest.setTimeout(60000);
const results = 'reports/allure-res';
// need to fix process hanging in tests
describe.skip('startReporterServer', () => {
  const start = async (debug: boolean, env: any): Promise<{ serv: undefined | WebSocketServer }> => {
    process.env.DEBUG = debug ? 'cypress-allure*' : undefined;
    // require to enable DEBUG logging
    const startReporterServer = require('../../../src/plugins/server').startReporterServer;
    const allureTasks = require('../../../src/plugins/allure').allureTasks;

    const reporter = allureTasks({
      allureAddVideoOnPass: true,
      allureResults: results,
      techAllureResults: `${results}/watch`,
      videos: 'reports/screens',
      screenshots: 'reports/screens',
      showDuplicateWarn: true,
      isTest: false,
    });
    const serv: { serv: undefined | WebSocketServer } = { serv: undefined };
    serv.serv = startReporterServer({ env } as any, reporter);

    // wait to start
    await new Promise(res => {
      setInterval(() => {
        if (env['allureWsPort'] !== undefined) {
          res(null);
        }
      });
    });

    return serv;
  };

  it('should start ws server', async () => {
    const log = consoleMock();
    const env = {};
    const serv = await start(true, env);

    const wsPathFixed = `${env['allureWsPort']}/__cypress/allure_messages/`.replace(/\/\//g, '/');
    const wsPath = `ws://localhost:${wsPathFixed}`;
    const ws = new WebSocket(wsPath, { origin: 'localhost' });
    const messages: string[] = [];

    const isOpened = await new Promise(res => {
      ws.on('error', err => {
        console.error(err);
        res(false);
      });
      ws.on('open', function open() {
        ws.send('OPENED');
      });
      ws.on('message', function msg(m) {
        messages.push(m.toString());

        if (m.toString() === 'connection established') {
          res(true);
        }
      });
    }).catch(err => {
      console.log(err);

      return false;
    });
    ws.close();

    await new Promise(res => {
      serv.serv!.close(err => {
        res(true);
      });
    });

    expect(isOpened).toEqual(true);

    try {
      expect(log.log.mock.calls.length).toEqual(1);
    } catch (err) {
      const mess = log.log.mock.calls;
      console.info(mess);
      throw err;
    }
    expect(log.log.mock.calls[0].map(t => t.replace(/\d+/g, 'number'))).toEqual([
      '[cypress-allure-adapter] running on number port',
    ]);
    expect(messages).toEqual(['connection established']);
  });

  it('should do some tasks', async () => {
    const env = {};

    if (existsSync(results)) {
      rmSync(results, { recursive: true });
    }
    await start(true, env);

    const wsPathFixed = `${env['allureWsPort']}/__cypress/allure_messages/`.replace(/\/\//g, '/');
    const wsPath = `ws://localhost:${wsPathFixed}`;
    const ws = new WebSocket(wsPath, { origin: 'localhost' });
    const messages: string[] = [];

    const isSent = await new Promise(res => {
      ws.on('error', err => {
        console.error(err);
        res(false);
      });
      ws.on('open', function open() {
        ws.send('OPENED');
      });
      ws.on('message', function msg(m) {
        messages.push(m.toString());

        if (m.toString() === 'connection established') {
          ws.send(JSON.stringify({ id: 1, data: { task: 'specStarted', arg: { spec: { relative: 'speccc' } } } }));
          ws.send(
            JSON.stringify({
              id: 2,
              data: { task: 'testStarted', arg: { title: 'test1', fullTitle: 'test1', id: '1' } },
            }),
          );
          ws.send(JSON.stringify({ id: 3, data: { task: 'testEnded', arg: { result: 'passed' } } }));
        }

        if (messages.length === 3) {
          res(true);
        }
      });
    }).catch(err => {
      console.log(err);

      return false;
    });
    ws.close();
    expect(isSent).toEqual(true);

    expect(messages).toEqual([
      'connection established',
      '{"status":"done"}',
      '{"payload":{"task":"specStarted","arg":{"spec":{"relative":"speccc"}}},"status":"done"}',
      '{"payload":{"task":"testStarted","arg":{"title":"test1","fullTitle":"test1","id":"1"}},"status":"done"}',
      '{"payload":{"task":"testEnded","arg":{"result":"passed"}},"status":"done"}',
    ]);
    expect(existsSync(results)).toEqual(true);
  });

  it('should not do unknown task', async () => {
    const env = {};

    if (existsSync(results)) {
      rmSync(results, { recursive: true });
    }
    await start(true, env);

    const wsPathFixed = `${env['allureWsPort']}/__cypress/allure_messages/`.replace(/\/\//g, '/');
    const wsPath = `ws://localhost:${wsPathFixed}`;
    const ws = new WebSocket(wsPath, { origin: 'localhost' });
    const messages: string[] = [];

    const isSent = await new Promise(res => {
      ws.on('error', err => {
        console.error(err);
        res(false);
      });
      ws.on('open', function open() {
        ws.send('OPENED');
      });
      ws.on('message', function msg(m) {
        messages.push(m.toString());

        if (m.toString() === 'connection established') {
          ws.send(JSON.stringify({ id: 1, data: { task: 'blslsl', arg: {} } }));
        }

        if (messages.length === 2) {
          res(true);
        }
      });
    }).catch(err => {
      console.log(err);

      return false;
    });
    ws.close();
    expect(isSent).toEqual(true);

    expect(messages).toEqual([
      'connection established',
      '{"status":"done"}',
      '{"payload":{"task":"blslsl","arg":{}},"status":"failed"}',
    ]);
    expect(existsSync(results)).toEqual(true);
  });

  it('should not execute  when not task', async () => {
    const env = {};

    if (existsSync(results)) {
      rmSync(results, { recursive: true });
    }
    await start(true, env);

    const wsPathFixed = `${env['allureWsPort']}/__cypress/allure_messages/`.replace(/\/\//g, '/');
    const wsPath = `ws://localhost:${wsPathFixed}`;
    const ws = new WebSocket(wsPath, { origin: 'localhost' });
    const messages: string[] = [];

    const isSent = await new Promise(res => {
      ws.on('error', err => {
        console.error(err);
        res(false);
      });
      ws.on('open', function open() {
        ws.send('OPENED');
      });
      ws.on('message', function msg(m) {
        messages.push(m.toString());

        if (m.toString() === 'connection established') {
          ws.send(JSON.stringify({ id: 1, data: {} }));
        }

        if (messages.length === 2) {
          res(true);
        }
      });
    }).catch(err => {
      console.log(err);

      return false;
    });
    ws.close();
    expect(isSent).toEqual(true);

    expect(messages).toEqual(['connection established', '{"status":"done"}', '{"payload":{},"status":"failed"}']);
    expect(existsSync(results)).toEqual(true);
  });
});
