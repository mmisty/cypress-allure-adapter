import RequestTask = Cypress.RequestTask;
import getUuid from 'uuid-by-string';
import getUuidByString from 'uuid-by-string';

export const registerReporter = () => {
  let id: string | undefined;
  const ignoreCommands = ['allure', 'then', 'wrap'];
  let logs: {
    [key: string]: [
      {
        task: string;
        arg: { date: number; forStep?: boolean; details?: string; status?: string; name?: string; id?: string };
      },
    ];
  } = {};

  beforeEach(() => {
    logs = {};
  });

  const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;
  let isAdd = true;

  const stopAdding = () => {
    isAdd = false;
  };
  console.log(runner.eventNames());

  afterEach(function (this: any) {
    console.log('AFTER');
    const test = this.currentTest;
    console.log(test);
    stopAdding();

    if (test) {
      cy.wrap(null, { log: false }).then(() => {
        addSteps(test.state, test.err?.message, this.currentTest);
      });
    }
  });
  /*Cypress.Commands.overwrite('screenshot', function (orig, subject, screenshotName, options) {
    const name = typeof screenshotName == 'string' ? `${screenshotName}${Date.now()}` : Cypress.spec.name + Date.now();

    console.log('OVERWRITE');
    console.log(this);
    console.log(screenshotName);
    console.log(options);
    orig(subject, name, options).then(() => {
      const id = getUuidByString(Date.now().toString());
      console.log('THEN ON SCREEN');
      //const logId = this.attributes.chainerId;
      //logs[logId];

      if (logs[id]) {
        logs[id].push({ task: 'screenshotOne', arg: { date: Date.now(), name } });
      } else {
        logs[id] = [{ task: 'screenshotOne', arg: { date: Date.now(), name } }];
      }
      console.log(logs);
    });
  });*/

  const addSteps = (isFail: boolean, message: string, test: Mocha.Test) => {
    console.log('addSteps');
    console.log(JSON.stringify(logs));

    const allLogs = Object.keys(logs)
      .flatMap(t => logs[t])
      .sort((a, b) => (a.arg.date < b.arg.date ? -1 : 1));
    console.log('allLogs');
    console.log(JSON.stringify(allLogs));

    if (isFail) {
      allLogs.push({ task: 'stepEnded', arg: { date: Date.now(), status: 'failed', details: message } });
      //allLogs.push({ task: 'testEnded', arg: { date: Date.now(), result: 'failed' } });
    } else {
      //allLogs.push({ task: 'testEnded', arg: { date: Date.now(), result: 'passed' } });
    }
    /* allLogs.forEach(t => {
      const task = t.task as RequestTask;
      cy.wrap(null).then(() => {
        console.log(`TASK: ${task}`);
      });
      cy.allure({ task, arg: t.arg as any }, { log: false });
      // wait cy.now('allure', { task: 'allLogs', arg: { allLogs } });
    });
    // cy.allure({ task: 'screenshot', arg: { path: Cypress.spec.name } });*/

    //cy.allure({ task: 'eventEnd', arg: {} });
    cy.wrap(null).then(() => {
      runner.emit('test end my', test);
    });
    //cy.allure({ task: 'allLogs', arg: { allLogs, spec: Cypress.spec } });
    //await this.screenshot({ path: arg.spec.name });
  };

  /* runner.on('fail', async (test: any, err) => {
    console.log('Fail\n\n');

    if (test.hookName === 'before all') {
      // add status details
    }
    await addSteps(true, err.message);
    //await cy.now('allure', { task: 'testEnded', arg: { result: 'failed' } });
  });

  runner.on('pass', async (_test: Mocha.Test) => {
    console.log('Pasas\n\n');
    await addSteps(false, '');
    //await cy.now('allure', { task: 'testEnded', arg: { result: 'passed' } });
  });

  runner.on('retry', async (_test: Mocha.Test) => {
    console.log('Failed\n\n');
    await addSteps(true, 'hjh');
    //await cy.now('allure', { task: 'testEnded', arg: { result: 'failed' } });
  });
*/
  Cypress.on('command:enqueued', async (...args) => {
    console.log('command:enqueued');
    console.log(args);
  });

  Cypress.on('log:changed', async (log, args) => {
    if (id !== log.id && log.url !== 'http://localhost:3000/__cypress/messages' && !ignoreCommands.includes(log.name)) {
      console.log('CHANGED');
      console.log(log);
      console.log(args);
      const msg = `${log.name} ${log.message} id: ${log.id} ${log.url}`;
      console.log(msg);
      console.log(args.attributes.id);
      const obj = Object.keys(log);
      const obj2 = Object.keys(args);
      console.log(obj);
      console.log(obj2);
      const ended = log.ended;
      console.log(`ENDED:${ended}`);
      const logId = args.attributes.chainerId;

      if (logs[logId] && ended) {
        // logs[logId].push({ task: 'step', arg: { name: msg, date: Date.now(), status: args.attributes.state } });
      }
      console.log('----- fin cahnge');
    }
  });
  Cypress.on('log:added', async (log, args) => {
    // const exclude = [{ name: 'request', url: 'http://localhost:3000/__cypress/messages' }, { name: 'allure' }];
    // return;

    //if (log.id !== id && exclude.every(t => log.name !== t.name) && exclude.every(t => t.url && log.url !== t.url)) {
    // await backendRequest('message', { name: log as string });
    if (
      isAdd &&
      id !== log.id &&
      log.url !== 'http://localhost:3000/__cypress/messages' &&
      !ignoreCommands.includes(log.name)
    ) {
      console.log('ADDED');
      const msg = `${log.name}: ${log.message}`;
      console.log(msg);
      console.log(args);
      const obj = Object.keys(log);
      const ended = log.end;
      console.log(`ENDED: ${ended}`);
      console.log(`ENDED: ${obj}`);
      //logs.push(['stepStarted', { name: msg, date: Date.now(), id: log.id }]);
      //logs.push(['sstep', { name: msg, date: Date.now(), id: log.id }]);

      if (ended) {
        // runner.emit('step');
        runner.emit('task', {
          task: 'step',
          arg: { name: msg },
        });
        //logs[log.chainerId] = [{ task: 'step', arg: { date: Date.now(), name: msg } }];
      } else {
        console.log('______');
        console.log(logs);
        runner.emit('task', {
          task: 'step',
          arg: { name: msg },
        });
        //runner.emit('step', msg);
        /* if (logs[log.chainerId]) {
          logs[log.chainerId].push({ task: 'step', arg: { date: Date.now(), name: msg } });
        } else {
          logs[log.chainerId] = [{ task: 'step', arg: { date: Date.now(), name: msg } }];
        }*/
      }

      id = log.id;
      console.log(`COMMAND LOG ${msg}`);

      /*for (const [i, logT] of logs.entries()) {
        console.log(logT);
        // await backendRequest('step', { name: msg, status: 'passed' });
        await backendRequest(logT[0], logT[1]);
      }*/
      //logs = [];
      // await backendRequest('stepStarted', { name: msg, date: Date.now() });
      //for (const [i, logT] of logs.entries()) {
      // await backendRequest('step', { name: msg, status: 'passed' });
      // await backendRequest(...logT);
      // logs.splice(i, 1);
      // }
      console.log('----- fin added');
    }
    // }
    // cy.allure({ task: 'stepStarted', arg: { name: log.name } });
  });
  Cypress.on('command:start', async command => {
    console.log(Object.keys(command.attributes));
    const name = command.attributes.name;
    const id = command.attributes.chainerId;

    const msg = `${name}: ${
      Array.isArray(command.attributes.args)
        ? command.attributes.args.join(', ')
        : JSON.stringify(command.attributes.args)
    }`;
    // const logId = command.attributes.logs?.[0]?.attributes.id;

    if (!ignoreCommands.includes(name)) {
      console.log(`COMMAND START ${msg}`);

      // runner.emit('step start', msg);
      runner.emit('task', {
        task: 'stepStarted',
        arg: { name: command.attributes.args[0] ?? 'anyName' },
      });
      // logs[id] = [{ task: 'stepStarted', arg: { date: Date.now(), name: msg } }];
      //await backendRequest('step', { name: `START ${msg}`, date: Date.now(), status: 'passed' });
    }

    if (name === 'screenshot') {
      runner.emit('task', {
        task: 'screenshotOne',
        arg: { forStep: true, name: command.attributes.args[0] ?? 'anyName' },
      });
      /*logs[id] = [
        {
          task: 'screenshotOne',
          arg: { date: Date.now(), forStep: true, name: command.attributes.args[0] ?? 'anyName' },
        },
      ]*/
    }
  });
  Cypress.on('command:end', async command => {
    console.log(command);
    console.log(Object.keys(command.attributes));
    const name = command.attributes.name;
    const msg = name + JSON.stringify(command.attributes.args);
    const logId = command.attributes.logs?.[0]?.attributes.id;

    const id = command.attributes.chainerId;

    if (!ignoreCommands.includes(name)) {
      console.log(`COMMAND END ${msg}`);

      runner.emit('task', {
        task: 'stepEnded',
        arg: { name: command.attributes.args[0] ?? 'anyName' },
      });
      //  runner.emit('step end', command.state);
      // logs.push(['stepEnded', { name: msg, date: Date.now(), id: logId, status: command.state }]);
      /*if (logs[id]) {
        logs[id].push({ task: 'stepEnded', arg: { name: msg, date: Date.now(), id: logId, status: command.state } });
      }*/
      //await backendRequest('step', { name: `END ${msg}`, date: Date.now(), status: 'passed' });
    }

    /*await backendRequest('step', { name: 'NOW COMMANDS' });
  
    for (const cmd of test.commands) {
      // await backendRequest('step', { name: msg, status: 'passed' });
      await backendRequest('step', { name: cmd.name + cmd.message });
    }*/
    //await backendRequest('stepEnded', { date: Date.now(), status: command.state });
    //});
    //Cypress.on('log:e', async log => {
    // console.log(log);
    // if (log.ended) {
    //  await backendRequest('stepEnded', { status: 'passed' });
    //}
    // cy.allure({ task: 'stepStarted', arg: { name: log.name } });
  });
};
