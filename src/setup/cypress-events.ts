import AllureTransfer = Cypress.AllureTransfer;
import RequestTask = Cypress.RequestTask;

const stepMessage = (name: string, args: string) => {
  return `${name}: ${args}`;
};

const commandParams = (command: any) => {
  const name = command.attributes.name;
  const commandArgs = command.attributes.args as any;
  const state = command.state;

  // exclude command logs with Cypress options isLog = false
  const isLog = () => {
    try {
      if (Array.isArray(commandArgs)) {
        return !commandArgs.some(a => a && a.log === false);
      }

      return commandArgs.log !== false;
    } catch (err) {
      return 'could not get log';
    }
  };

  const getArgs = () => {
    const convertEmptyObj = (obj: Record<string, unknown>) =>
      obj == null ? 'null' : Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';

    try {
      if (Array.isArray(commandArgs)) {
        return commandArgs
          .map(t => (typeof t === 'string' ? t : convertEmptyObj(t)))
          .filter(t => t.trim() !== '')
          .join(', ');
      }

      return convertEmptyObj(commandArgs);
    } catch (err) {
      return 'could not parse args';
    }
  };

  return {
    name,
    message: stepMessage(name, getArgs()),
    isLog: isLog(),
    state,
  };
};

const createEmitEvent =
  (runner: Mocha.Runner) =>
  <T extends RequestTask>(args: AllureTransfer<T>) => {
    runner.emit('task', args);
  };

export const handleCyLogEvents = (runner: Mocha.Runner, config: { ignoreCommands: string[] }) => {
  const { ignoreCommands } = config;
  const commands: string[] = [];
  const emit = createEmitEvent(runner);

  Cypress.on('log:added', async log => {
    const cmdMessage = stepMessage(log.name, log.message);
    const logName = log.name;
    // const isEnded = log.end;

    // logs are being added for all from command log, need to exclude same items
    if (cmdMessage !== commands[commands.length - 1] && !ignoreCommands.includes(logName)) {
      emit({ task: 'step', arg: { name: cmdMessage } });
    }
  });

  /* Cypress.on('log:changed', async log => {
    const cmdMessage = stepMessage(log.name, log.message);
    const logId = log.id;
    const isEnded = log.ended;
    const status = log.state;

    if (
      isEnded &&
      currentLog.includes(logId) &&
      !ignoreCommands.includes(log.name)
    ) {
    
      emit({ task: 'step', arg: { name: cmdMessage, status } }));
      currentLog.pop();
    }
  });*/

  Cypress.on('command:start', async command => {
    const { name, message: cmdMessage, isLog } = commandParams(command);

    if (isLog && !ignoreCommands.includes(name)) {
      commands.push(cmdMessage);
      emit({ task: 'stepStarted', arg: { name: cmdMessage } });
    }

    if (name === 'screenshot') {
      const screenName = command.attributes.args[0] ?? 'anyName';
      emit({ task: 'screenshotOne', arg: { forStep: true, name: screenName } });
    }
  });

  /* Cypress.on('skipped:command:end', async command => {
    console.log('skipped:command:end');
    console.log(command);
  });

  Cypress.on('command:enqueued', async command => {
    console.log('command:enqueued');
    console.log(command.name);
    console.log(command);
  });
  s*/

  Cypress.on('command:end', async command => {
    console.log(command);
    const { name, isLog, state } = commandParams(command);

    if (isLog && !ignoreCommands.includes(name)) {
      emit({ task: 'stepEnded', arg: { status: state } });
      commands.pop();
    }
  });
};
