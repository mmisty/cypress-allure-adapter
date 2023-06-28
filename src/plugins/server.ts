import { json, urlencoded } from 'body-parser';
import express = require('express');
import cors = require('cors');
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { AllureTasks } from './allure';
import RequestTask = Cypress.RequestTask;

const log = (...args: unknown[]) => {
  console.log(`[allure-server] ${args}`);
};

export function startReporterServer(configOptions: PluginConfigOptions, port: number, tasks: AllureTasks) {
  const app = express();

  app.listen(port, () => {
    log(`Example app listening on port ${port}`);
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
}
