import WebSocket, { WebSocketServer } from 'ws';
import { existsSync, rmSync } from 'fs';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { consoleMock } from '../../mocks/console-mock';
import { AllureTaskClient } from '@src/plugins/allure-task-client';

jest.setTimeout(60000);
const results = 'reports/allure-res';
const resultsPathWatch = `${results}/watch`;

describe('startReporterServer', () => {
  beforeEach(() => {
    consoleMock();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const messages = require('../../../src/plugins/server').testMessages;
    messages.splice(0, messages.length);
  });

  const start = async (
    debug: boolean,
    env: any,
  ): Promise<{ serv: undefined | WebSocketServer }> => {
    process.env.DEBUG = debug ? 'cypress-allure*' : '';

    // require to enable DEBUG logging
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const startReporterServer =
      require('../../../src/plugins/server').startReporterServer;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const allureTasks = require('../../../src/plugins/allure').allureTasks;

    // Use local mode client for tests (no separate process)
    const client = new AllureTaskClient('remote');
    await client.start();

    const reporter = allureTasks(
      {
        allureAddVideoOnPass: true,
        allureResults: results,
        techAllureResults: resultsPathWatch,
        videos: 'reports/screens',
        screenshots: 'reports/screens',
        showDuplicateWarn: true,
        allureSkipSteps: '',
        isTest: false,
      },
      client,
    );
    const serv: { serv: undefined | WebSocketServer } = { serv: undefined };
    serv.serv = startReporterServer({ env } as any, reporter);

    // wait to start
    return new Promise((res, rej) => {
      setTimeout(() => {
        if (env['allureWsPort'] !== undefined) {
          res(null);
        } else {
          rej('Ws not started');
        }
      }, 1000);
    }).then(() => {
      return serv;
    });
  };

  const startWsAndClient = (
    sendObjs: any[],
    callback: (back: string[]) => void,
  ) => {
    const env = {};

    const back: any[] = [];

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const messages = require('../../../src/plugins/server').testMessages;
    messages.splice(0, messages.length);

    console.log(messages);

    if (existsSync(results)) {
      rmSync(results, { recursive: true });
    }

    return start(true, env).then(serv => {
      const wsPathFixed =
        `${env['allureWsPort']}/__cypress/allure_messages/`.replace(
          /\/\//g,
          '/',
        );
      const wsPath = `ws://localhost:${wsPathFixed}`;
      const ws = new WebSocket(wsPath, { origin: 'localhost' });

      return new Promise(res => {
        ws.on('error', err => {
          console.error(err);
          res(false);
        });
        ws.on('open', function open() {
          ws.send('OPENED');

          sendObjs.forEach((obj, i) => {
            ws.send(
              JSON.stringify({
                id: i + 1,
                ...obj,
              }),
            );
          });
        });

        ws.on('message', function msg(m) {
          if (`${m}` !== 'connection established') {
            back.push(`${m}`);
          }

          res(true);
        });
      })
        .catch(err => {
          console.log(err);

          return false;
        })
        .then(() => {
          return new Promise((resolveAllGot, rejectGotAll) => {
            const started = Date.now();

            const interval = setInterval(() => {
              if (messages.length < sendObjs.length + 1) {
                // +1 - connection established message
                if (Date.now() - started > 4000) {
                  rejectGotAll('Not received all');
                }
              } else {
                clearInterval(interval);
                resolveAllGot(true);
              }
            });
          })
            .then(() => {
              let closed = false;
              ws.close();
              serv.serv!.on('close', () => {
                closed = true;
              });
              serv.serv!.close();

              return new Promise((res, rej) => {
                setTimeout(() => {
                  if (closed) {
                    console.log('SERVER CLOSED');
                    res(null);
                  } else {
                    rej('Ws server was not closed');
                  }
                }, 1000);
              });
            })
            .then(() => {
              callback(back);
            });
        });
    });
  };

  it('should do some tasks', () => {
    return startWsAndClient(
      [
        {
          data: { task: 'specStarted', arg: { spec: { relative: 'speccc' } } },
        },
        {
          data: {
            task: 'testStarted',
            arg: { title: 'test1', fullTitle: 'test1', id: '1' },
          },
        },
        { data: { task: 'testEnded', arg: { result: 'passed' } } },
      ],
      back => {
        expect(back).toEqual([
          '{"status":"done"}',
          '{"payload":{"task":"specStarted","arg":{"spec":{"relative":"speccc"}}},"status":"done"}',
          '{"payload":{"task":"testStarted","arg":{"title":"test1","fullTitle":"test1","id":"1"}},"status":"done"}',
          '{"payload":{"task":"testEnded","arg":{"result":"passed"}},"status":"done"}',
        ]);
        expect(existsSync(results)).toEqual(true);
      },
    );
  });

  it('should not do unknown task', () => {
    return startWsAndClient(
      [
        {
          data: { task: 'blslsl', arg: {} },
        },
      ],
      back => {
        expect(back).toEqual([
          '{"status":"done"}',
          '{"payload":{"task":"blslsl","arg":{}},"status":"failed"}',
        ]);
        expect(existsSync(results)).toEqual(true);
      },
    );
  });

  it('should not do when no task', () => {
    return startWsAndClient([{ data: {}, id: 1 }], back => {
      expect(back).toEqual([
        '{"status":"done"}',
        '{"payload":{},"status":"failed"}',
      ]);

      expect(existsSync(results)).toEqual(true);
    });
  });

  it('should write result', () => {
    return startWsAndClient(
      [
        {
          data: { task: 'specStarted', arg: { spec: { relative: 'speccc' } } },
        },
        {
          data: {
            task: 'testStarted',
            arg: { title: 'test1', fullTitle: 'test1', id: '1' },
          },
        },
        { data: { task: 'testEnded', arg: { result: 'passed' } } },

        {
          data: {
            task: 'testResult',
            arg: { title: 'test1', id: 'testID1', result: 'passed' },
          },
        },
        {
          data: {
            task: 'afterSpec',
            arg: { results: { spec: { relative: '123' } } },
          },
        },
        {
          data: {
            task: 'waitAllFinished',
            arg: {},
          },
        },
      ],
      () => {
        expect(existsSync(results)).toEqual(true);

        const pa: AllureTest[] = parseAllure(resultsPathWatch, {
          logError: false,
        });
        expect(
          pa.map(t => ({
            name: t.name,
            fullName: t.fullName,
            status: t.status,
          })),
        ).toEqual([
          {
            fullName: 'test1',
            name: 'test1',
            status: 'passed',
          },
        ]);
      },
    );
  });
});
