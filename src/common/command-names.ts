import { packageLog } from './';

export const ARGS_TRIM_AT = 200;
export const COMMAND_REQUEST = 'request';

export type CommandLog = { attributes?: { name?: string; consoleProps?: () => any; message?: string } };
export type CommandT = {
  state?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes?: {
    name?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logs?: CommandLog[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subject?: any;
    prev?: CommandT;
    next?: CommandT;
  };
};

export const isGherkin = (logName: string): boolean => {
  return logName ? ['When', 'Given', 'Then', 'And', 'After', 'Before'].some(t => logName.startsWith(t)) : false;
};

export const ignoreAllCommands = (ignoreCommands: () => string[]) => {
  const cmds = [...ignoreCommands(), 'should', 'then', 'allure', 'doSyncCommand']
    .filter(t => t.trim() !== '')
    .map(x => new RegExp(`^${x.replace(/\*/g, '.*')}$`));

  return {
    includes(ttl: string): boolean {
      return cmds.some(t => t.test(ttl));
    },
  };
};

export const filterCommandLog = (command: CommandT, ignoreCommands: () => string[]): CommandLog[] => {
  const cmdAttrs = command?.attributes as any;

  return (
    cmdAttrs?.logs?.filter(log => {
      const attr = log.attributes;
      const logName = attr.name;

      const cmdMsg = commandParams(command)?.message ?? '';
      const logMessage = stepMessage(attr.name, attr.message === 'null' ? '' : attr.message);
      console.log(`cmdMsg     ${cmdMsg}`);
      console.log(`logMessage ${logMessage}`);
      console.log('----');

      const gherkin = isGherkin(logName);
      const equalMessages = logMessage === cmdMsg;
      const isRequest = logName === COMMAND_REQUEST;
      const isIts = cmdMsg.match(/its:\s*\..*/); // its already logged as command
      const ignoredLog = ignoreAllCommands(ignoreCommands).includes(logName);

      // when same args and name for log and current command or when gherkin - do not show
      return !equalMessages && !gherkin && !isRequest && !isIts && !ignoredLog;
    }) ?? []
  );
};

export const withTry = (message: string, callback: () => void) => {
  try {
    callback();
  } catch (err) {
    const e = err as Error;
    console.error(`${packageLog} could do '${message}': ${e.message}`);
    console.error(e.stack);
  }
};

export const stepMessage = (name: string, args: string | undefined) => {
  const isLong = args && args.length > ARGS_TRIM_AT;
  const stringArgs = args && args.length > 0 ? `: ${args}` : '';
  const isAssertLog = name === 'assert';

  const argsLine = isLong && !isAssertLog ? '' : stringArgs;

  return `${name}${argsLine}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stringify = (args: any, indent?: string): string => {
  const getArr = () => {
    try {
      if (Array.isArray(args)) {
        return `[${args.map(a => stringify(a, indent)).join(',')}]`;
      } else {
        return convertEmptyObj(args, indent);
      }
    } catch (err) {
      return 'could not stringify';
    }
  };

  if (typeof args === 'string') {
    try {
      return stringify(JSON.parse(args), indent);
    } catch (err) {
      return `${args}`;
    }
  }

  return typeof args === 'string' || typeof args === 'number' || typeof args === 'boolean' ? `${args}` : getArr();
};

export const requestName = (url: string, method: string) => {
  return `${method}, ${url}`;
};

function formatObject(obj: Record<string, any>, indent?: string): string {
  const keys = Object.keys(obj);

  const entries = keys
    .map(key => {
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `${key}: ${formatObject(value, indent?.repeat(2))}`;
      } else {
        return `${key}: ${value}`;
      }
    })
    .join(', ');

  return `{ ${entries} }`;
}

const convertEmptyObj = (obj: Record<string, unknown>, indent?: string): string => {
  if (obj == null) {
    return '';
  }

  if (Object.keys(obj).length > 0) {
    try {
      return !indent ? formatObject(obj) : formatObject(obj, indent);
    } catch (e) {
      return 'could not stringify';
    }
  }

  return '';
};

export const commandParams = (command: CommandT) => {
  const name = command.attributes?.name ?? 'no name';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commandArgs = command.attributes?.args as any;
  const state = command.state ?? 'passed';

  // exclude command logs with Cypress options isLog = false
  const isLog = () => {
    try {
      if (commandArgs && Array.isArray(commandArgs)) {
        return !commandArgs.some(a => a && a.log === false);
      }

      return commandArgs.log !== false;
    } catch (err) {
      return false; // 'could not get log';
    }
  };

  const getArgs = (): string[] => {
    try {
      if (Array.isArray(commandArgs)) {
        return commandArgs
          .map(arg => {
            if (name === COMMAND_REQUEST && typeof arg === 'object' && arg.method && arg.url) {
              return requestName(arg.url, arg.method);
            }

            return stringify(arg);
          })
          .filter(x => x.trim() !== '');
      }

      return [convertEmptyObj(commandArgs)];
    } catch (err) {
      return ['could not parse args'];
    }
  };
  const args = getArgs();

  return {
    name,
    args,
    message: stepMessage(name, args.filter(t => t.length < ARGS_TRIM_AT).join(', ')),
    isLog: isLog(),
    state,
  };
};
