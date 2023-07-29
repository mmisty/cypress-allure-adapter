import PluginConfigOptions = Cypress.PluginConfigOptions;
import { RawData, WebSocketServer } from 'ws';
import { ENV_WS, packageLog, wsPath } from '../common';
import Debug from 'debug';
import { AllureTasks, RequestTask } from '../plugins/allure-types';

const debug = Debug('cypress-allure:server');
const logMessage = Debug('cypress-allure:server:message');

const log = (...args: unknown[]) => {
  debug(`${args}`);
};

const messageGot = (...args: unknown[]) => {
  logMessage(`${args}`);
};

function getRandomPortNumber(): number {
  return 40000 + Math.round(Math.random() * 25000);
}

const socketLogic = (port: number, sockserver: WebSocketServer | undefined, tasks: AllureTasks) => {
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

      const parseData = (data: RawData) => {
        try {
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
  const wsPort = getRandomPortNumber();

  const sockserver: WebSocketServer | undefined = new WebSocketServer({ port: wsPort, path: wsPath }, () => {
    configOptions.env[ENV_WS] = wsPort;
    const attemptMessage = attempt > 0 ? ` from ${attempt} attempt` : '';
    console.log(`${packageLog} running on ${wsPort} port${attemptMessage}`);
    socketLogic(wsPort, sockserver, tasks);
  });

  sockserver.on('error', err => {
    if (err.message.indexOf('address already in use') !== -1) {
      if (attempt < 30) {
        startReporterServer(configOptions, tasks, attempt + 1);
      } else {
        console.error(`${packageLog} Could not find free port, will not report: ${err.message}`);
      }

      return;
    }

    console.error(`${packageLog} Error on ws server: ${(err as Error).message}`);
  });
};

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
