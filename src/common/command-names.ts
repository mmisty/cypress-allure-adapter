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
  const cmdAttrs = command?.attributes;
  const cmdLogs = cmdAttrs?.logs ?? [];

  return (
    cmdLogs.filter(log => {
      const attr = log.attributes;
      const logName = attr?.name ?? '';
      const logMessageAttr = attr?.message ?? '';

      const cmdMsg = commandParams(command)?.message ?? '';
      const logMessage = stepMessage(logName, logMessageAttr === 'null' ? '' : logMessageAttr);

      // console.log(`cmdMsg     ${cmdMsg}`);
      // console.log(`logMessage ${logMessage}`);

      const gherkin = isGherkin(logName);
      const equalMessages = logMessage === cmdMsg;
      const isRequest = logName === COMMAND_REQUEST;
      const isIts = /its:\s*\..*/.test(logMessage); // its already logged as command
      const ignoredLog = ignoreAllCommands(ignoreCommands).includes(logName);
      const isLogMsgEqCommandName = logMessage === cmdAttrs?.name;
      const noLogConditions = [gherkin, equalMessages, isRequest, isIts, ignoredLog, isLogMsgEqCommandName];

      // console.log(noLogConditions);
      // console.log('----');

      return noLogConditions.every(c => !c);
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
export const stringify = (args: any, isJSON: boolean, indent?: string): string => {
  const getArr = () => {
    try {
      if (Array.isArray(args)) {
        return `[${args.map(a => stringify(a, isJSON, indent)).join(',')}]`;
      } else {
        return convertEmptyObj(args, isJSON, indent);
      }
    } catch (err) {
      return 'could not stringify';
    }
  };

  if (typeof args === 'string') {
    try {
      return stringify(JSON.parse(args), isJSON, indent);
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
  const indStr = indent ?? '';

  const entries = keys
    .map(key => {
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `${indStr}${key}: ${formatObject(value, indent?.repeat(2))}`;
      } else if (value !== null && Array.isArray(value)) {
        `${indStr}${key}: [${value.map(v => formatObject(v, indent))}]`;
      } else {
        if (typeof value === 'string') {
          return `${indStr}${key}: "${value}"`;
        } else {
          return `${indStr}${key}: ${value}`;
        }
      }
    })
    .join(',');

  if (indent) {
    return `{\n${entries}\n${indent}}`;
  }

  return `{${entries}}`;
}

const convertEmptyObj = (obj: Record<string, unknown>, isJSON: boolean, indent?: string): string => {
  if (obj == null) {
    return '';
  }

  if (Object.keys(obj).length > 0) {
    try {
      if (isJSON) {
        return !indent ? JSON.stringify(obj) : JSON.stringify(obj, null, indent);
      } else {
        return formatObject(obj, indent);
      }
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

            return stringify(arg, false);
          })
          .filter(x => x.trim() !== '');
      }

      return [convertEmptyObj(commandArgs, false)];
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
