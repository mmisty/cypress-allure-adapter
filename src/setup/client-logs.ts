export const registerLogs = () => {
  let id: string | undefined;

  let logs: {
    [key: string]: [
      { task: string; arg: { date: number; details?: string; status?: string; name?: string; id?: string } },
    ];
  } = {};

  const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;

  const addSteps = async (isFail: boolean, message: string) => {
    const allLogs = Object.keys(logs)
      .flatMap(t => logs[t])
      .sort((a, b) => (a.arg.date < b.arg.date ? -1 : 1));
    console.log('allLogs');
    console.log(allLogs);

    if (isFail) {
      allLogs.push({ task: 'stepEnded', arg: { date: Date.now(), status: 'failed', details: message } });
      //allLogs.push({ task: 'testEnded', arg: { date: Date.now(), result: 'failed' } });
    } else {
      //allLogs.push({ task: 'testEnded', arg: { date: Date.now(), result: 'passed' } });
    }
    logs = {};
    await cy.now('allure', { task: 'allLogs', arg: { allLogs, spec: Cypress.spec } });
  };
  runner.on('fail', async (test: any, err) => {
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

  Cypress.on('log:changed', async (log, args) => {
    if (id !== log.id && log.url !== 'http://localhost:3000/__cypress/messages' && log.name !== 'allure') {
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
    if (id !== log.id && log.url !== 'http://localhost:3000/__cypress/messages' && log.name !== 'allure') {
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
        logs[log.chainerId] = [{ task: 'step', arg: { date: Date.now(), name: msg } }];
      } else {
        console.log('______');
        console.log(logs);

        if (logs[log.chainerId]) {
          logs[log.chainerId].push({ task: 'step', arg: { date: Date.now(), name: msg } });
        } else {
          logs[log.chainerId] = [{ task: 'step', arg: { date: Date.now(), name: msg } }];
        }
        /* const logss = Object.keys(logs)
          .flatMap(x => logs[x].map(t => ({ ...t, key: x })))
          .sort((a, b) => (a.arg.date < b.arg.date ? -1 : 1));
        console.log(logss);
        //logs[log.id] = [{ task: 'stepStarted', arg: { date: Date.now(), name: msg } }];
        const last = logss[logss.length - 1];
        logs[last.key].push({ task: 'stepStarted', arg: { date: Date.now(), name: msg } });*/
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

    if (name !== 'allure') {
      console.log(`COMMAND START ${msg}`);
      logs[id] = [{ task: 'stepStarted', arg: { date: Date.now(), name: msg } }];
      //await backendRequest('step', { name: `START ${msg}`, date: Date.now(), status: 'passed' });
    }
  });

  Cypress.on('command:end', async command => {
    console.log(command);
    console.log(Object.keys(command.attributes));
    const name = command.attributes.name;
    const msg = name + JSON.stringify(command.attributes.args);
    const logId = command.attributes.logs?.[0]?.attributes.id;

    const id = command.attributes.chainerId;

    if (name !== 'allure') {
      console.log(`COMMAND END ${msg}`);

      // logs.push(['stepEnded', { name: msg, date: Date.now(), id: logId, status: command.state }]);
      if (logs[id]) {
        logs[id].push({ task: 'stepEnded', arg: { name: msg, date: Date.now(), id: logId, status: command.state } });
      }
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
