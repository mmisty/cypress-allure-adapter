import PluginConfigOptions = Cypress.PluginConfigOptions;
import { AllureTasks } from './allure';
import RequestTask = Cypress.RequestTask;
import { RawData, WebSocketServer } from 'ws';
import { ENV_WS, wsPath } from '../common';

const log = (...args: unknown[]) => {
  console.log(`[allure-server] ${args}`);
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

export function startReporterServer(configOptions: PluginConfigOptions, tasks: AllureTasks) {
  const sockserver = startWsServerRetry(configOptions);

  if (!sockserver) {
    log('Could not start reporting server');

    return;
  }

  sockserver.on('connection', ws => {
    log('New client connected!');
    ws.send('connection established');
    ws.on('close', () => log('Client has disconnected!'));

    ws.on('message', data => {
      const parseData = (data: RawData) => {
        try {
          return JSON.parse(data.toString()) as any;
        } catch (e) {
          // console.log((e as Error).message);

          return {};
        }
      };
      const requestData = parseData(data);
      log(JSON.stringify(requestData));

      if (Object.keys(tasks).indexOf(requestData.task) !== -1) {
        const task = requestData.task as RequestTask; // todo check
        log(task);
        tasks[task](requestData.arg);
      } else {
        const msg = requestData.task ? `No such task: ${requestData.task}` : 'No task property in message';
        log(msg);
      }

      sockserver.clients.forEach(client => {
        log(`sending back: ${data}`);
        client.send(JSON.stringify({ task: requestData?.task, status: 'done' }));
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
