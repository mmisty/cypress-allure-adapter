import PluginConfigOptions = Cypress.PluginConfigOptions;
import { RawData, WebSocketServer } from 'ws';
import { ENV_WS, packageLog, wsPath } from '../common';
import Debug from 'debug';
import { AllureTasks, RequestTask } from '../plugins/allure-types';
import { execSync } from 'child_process';

const debug = Debug('cypress-allure:server');
const logMessage = Debug('cypress-allure:server:message');

const log = (...args: unknown[]) => {
  debug(`${args}`);
};

// for testing
export const testMessages: any[] = [];

const messageGot = (...args: unknown[]) => {
  logMessage(`${args}`);
};

import net from 'net';

const checkPortSync = (port: number, timeoutMs = 2000): boolean => {
  let isAvailable = true;
  let server: net.Server | null = null;
  let timeoutReached = false;
  const startTime = Date.now();

  try {
    server = net.createServer();
    server.listen(port);

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        isAvailable = false;
      }
    });

    const checkTimeout = () => {
      if (Date.now() - startTime >= timeoutMs) {
        timeoutReached = true;
      }
    };

    const waitForListening = () => {
      if (!server?.listening && !timeoutReached) {
        process.nextTick(waitForListening); // Yield to event loop
        checkTimeout(); // Check if timeout has been reached
      }
    };

    waitForListening();

    if (timeoutReached) {
      throw new Error(`Timeout waiting for port ${port} to become available.`);
    }
  } catch (error) {
    isAvailable = false;
  } finally {
    if (server) {
      server.close();
    }
  }

  return isAvailable;
};

function retrieveRandomPortNumber(): number {
  let port;

  for (let i = 0; i < 30; i++) {
    port = 40000 + Math.round(Math.random() * 25000);
    const result = checkPortSync(port);

    if (result) {
      return port;
    }
  }

  console.log(`${packageLog} could not find free port, will not report`);

  return port;
}

const socketLogic = (sockserver: WebSocketServer | undefined, tasks: AllureTasks) => {
  if (!sockserver) {
    log('Could not start reporting server');

    return;
  }

  sockserver.on('connection', ws => {
    log('New client connected!');
    ws.send('connection established');
    ws.on('close', () => {
      log('Client has disconnected!');
    });

    ws.on('message', data => {
      messageGot('message received');
      messageGot(data);

      testMessages.push(`${data}`);

      const parseData = (data: RawData) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return JSON.parse(data.toString()) as any;
        } catch (e) {
          // console.log((e as Error).message);

          return {};
        }
      };
      const requestData = parseData(data);
      const payload = requestData.data;

      if (requestData.id) {
        const result = executeTask(tasks, payload);

        sockserver.clients.forEach(client => {
          log(`sending back: ${JSON.stringify(requestData)}`);
          client.send(JSON.stringify({ payload, status: result ? 'done' : 'failed' }));
        });
      } else {
        sockserver.clients.forEach(client => {
          log(`sending back: ${JSON.stringify(requestData)}`);
          client.send(JSON.stringify({ payload, status: 'done' }));
        });
      }
    });

    ws.onerror = function () {
      console.log(`${packageLog} websocket error`);
    };
  });
};

export const startReporterServer = (configOptions: PluginConfigOptions, tasks: AllureTasks, attempt = 0) => {
  const wsPort = retrieveRandomPortNumber();

  let sockserver: WebSocketServer | undefined = new WebSocketServer({ port: wsPort, path: wsPath }, () => {
    configOptions.env[ENV_WS] = wsPort;
    const attemptMessage = attempt > 0 ? ` from ${attempt} attempt` : '';
    console.log(`${packageLog} running on ${wsPort} port${attemptMessage}`);
    socketLogic(sockserver, tasks);
  });

  sockserver.on('error', err => {
    if (err.message.indexOf('address already in use') !== -1) {
      if (attempt < 30) {
        process.nextTick(() => {
          sockserver = startReporterServer(configOptions, tasks, attempt + 1);
        });
      } else {
        console.error(`${packageLog} Could not find free port, will not report: ${err.message}`);
      }

      return;
    }

    console.error(`${packageLog} Error on ws server: ${(err as Error).message}`);
  });

  return sockserver;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const executeTask = (tasks: AllureTasks, data: { task?: any; arg?: any }): boolean => {
  if (!data || !data.task) {
    log(`Will not run task - not data or task field:${JSON.stringify(data)}`);

    return false;
  }

  try {
    if (Object.keys(tasks).indexOf(data.task) !== -1) {
      const task = data.task as RequestTask; // todo check
      log(task);
      tasks[task](data.arg);

      return true;
    } else {
      log(`No such task: ${data.task}`);
    }
  } catch (err) {
    console.error(`${packageLog} Error running task: '${data.task}': ${(err as Error).message}`);
    console.log((err as Error).stack);
  }

  return false;
};
