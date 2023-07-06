import PluginConfigOptions = Cypress.PluginConfigOptions;
import { RawData, WebSocketServer } from 'ws';
import { ENV_WS, wsPath } from '../common';
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

function getPort(existingPort?: number): number {
  if (existingPort) {
    log(`existing port: ${existingPort}`);

    return existingPort;
  }

  const port = 40000 + Math.round(Math.random() * 25000);
  log(`new port: ${port}`);

  return port;
}

const startWsServerRetry = (configOptions: PluginConfigOptions): WebSocketServer | undefined => {
  for (let i = 0; i < 10; i++) {
    try {
      const wsPort = getPort();
      const sockserver = new WebSocketServer({ port: wsPort, path: wsPath });

      configOptions.env[ENV_WS] = wsPort;

      return sockserver;
    } catch (err) {
      log(`Could not created ws server${(err as Error).message}`);
    }
  }
};

const executeTask = (tasks: AllureTasks, data: { task: any; arg: any }) => {
  if (!data || !data.task) {
    log(`Will not run task - not data or task field:${JSON.stringify(data)}`);

    return;
  }

  if (Object.keys(tasks).indexOf(data.task) !== -1) {
    const task = data.task as RequestTask; // todo check
    log(task);
    tasks[task](data.arg);
  } else {
    const msg = data.task ? `No such task: ${data.task}` : 'No task property in message';
    log(msg);
  }
};

export function startReporterServer(configOptions: PluginConfigOptions, tasks: AllureTasks) {
  const sockserver = startWsServerRetry(configOptions);

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
        executeTask(tasks, payload);
      }
      sockserver.clients.forEach(client => {
        log(`sending back: ${payload?.task}`);
        client.send(JSON.stringify({ task: payload?.task, status: 'done' }));
      });
    });

    ws.onerror = function () {
      console.log('websocket error');
    };

    /*setInterval(() => {
      const videos = 'integration/videos';
      const files = readdirSync(videos);
      files.forEach(f => {
        const fileVideo = path.join(videos, f);
        console.log(fileVideo);

        if (attached.indexOf(fileVideo) === -1) {
          // ws.send(JSON.stringify({ event: 'video', path: fileVideo }));
          tasks['attachVideoToTests']({ path: fileVideo });
          // ws.send(JSON.stringify({ event: 'attachVideoToTests', path: fileVideo }));
          attached.push(fileVideo);
        }
      });
    }, 1000);*/
  });

  return undefined;
}
