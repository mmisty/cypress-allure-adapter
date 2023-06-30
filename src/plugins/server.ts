import { json, urlencoded } from 'body-parser';
import express = require('express');
import cors = require('cors');
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { AllureTasks } from './allure';
import RequestTask = Cypress.RequestTask;
import { RawData, WebSocketServer } from 'ws';

const log = (...args: unknown[]) => {
  console.log(`[allure-server] ${args}`);
};

export function startReporterServer(configOptions: PluginConfigOptions, port: number, tasks: AllureTasks) {
  const app = express();
  const attached: string[] = [];

  const server = app.listen(port, () => {
    log(`Listening on port ${port}`);
  });

  const sockserver = new WebSocketServer({ port: 443 });

  sockserver.on('connection', ws => {
    console.log('New client connected!');
    ws.send('connection established');
    ws.on('close', () => console.log('Client has disconnected!'));

    ws.on('message', data => {
      const parseData = (data: RawData) => {
        try {
          return JSON.parse(data.toString()) as any;
        } catch (e) {
          console.log((e as Error).message);

          return {};
        }
      };
      const requestData = parseData(data);
      log(requestData);

      if (Object.keys(tasks).indexOf(requestData.task) !== -1) {
        const task = requestData.task as RequestTask; // todo check
        log(task);
        tasks[task](requestData.arg);
      } else {
        log(`No such task: ${requestData.task}`);
      }

      // res.send('Data Received');

      sockserver.clients.forEach(client => {
        console.log(`distributing message: ${data}`);
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

  app.use(cors({ origin: '*' }));
  app.use(json());
  app.use(urlencoded({ extended: false }));

  app.post('/__cypress/messages', (req, res) => {
    const requestData = req.body;
    log(requestData);

    if (Object.keys(tasks).indexOf(requestData.task) !== -1) {
      const task = requestData.task as RequestTask; // todo check
      log(task);
      tasks[task](requestData.arg);
    } else {
      log(`No such task: ${requestData.task}`);
    }

    res.send('Data Received');
  });

  server.on('close', () => {
    console.log('CLosing server');
  });

  return server;
}
