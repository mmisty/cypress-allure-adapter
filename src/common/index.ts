import type { ContentType } from '../common/types';

export const wsPath = '/__cypress/allure_messages/';
export const ENV_WS = 'allureWsPort';
export const packageLog = '[cypress-allure-adapter]';

export const logWithPackage = (level: 'log' | 'error' | 'warn', message: string) => {
  // eslint-disable-next-line no-console
  console[level](`${packageLog} ${message}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Message = { data: any; id: number };

export class MessageQueue {
  private id = 0;
  private messages: Message[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enqueue(data: any) {
    this.id++;
    const message: Message = { data, id: this.id };
    this.messages.push(message);
    this.messages.sort((a, b) => a.id - b.id);
  }

  dequeueAll(): Message[] | undefined {
    return this.messages.splice(0, this.messages.length);
  }
}

export const tmsIssueUrl = (env: Record<string, string>, value: string, type: 'issue' | 'tms') => {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (type === 'issue' && !env['issuePrefix']) {
    return value;
  }

  if (type === 'tms' && !env['tmsPrefix']) {
    return value;
  }

  const prefix = type === 'tms' ? env['tmsPrefix'] : env['issuePrefix'];

  if (prefix.indexOf('*') !== -1) {
    return prefix.replace('*', value);
  }

  const prefixFixed = prefix.endsWith('/') ? prefix.slice(0, prefix.length - 1) : prefix;

  return `${prefixFixed}/${value}`;
};

export const tmsIssueId = (env: Record<string, string>, value: string, type: 'issue' | 'tms') => {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return undefined;
  }

  if (type === 'issue') {
    return env['issuePrefix'] ? value : undefined;
  }

  if (type === 'tms') {
    return env['tmsPrefix'] ? value : undefined;
  }

  return undefined;
};

export const descriptionId = (env: Record<string, string>, value: string, type: 'issue' | 'tms', desc?: string) => {
  const id = tmsIssueId(env, value, type);
  const idStr = id ? `${id}: ` : '';

  return desc ? `${idStr}${desc}` : value;
};

// needed to work in browser
export const extname = (path: string): string => {
  return path.match(/(\.[^.\\/]+)$/)?.[0] ?? '.unknown';
};

// needed to work in browser
export const basename = (path: string): string => {
  const slashIndex = path.lastIndexOf('/');

  if (slashIndex > 0) {
    return path.slice(slashIndex + 1);
  }

  return path;
};

export async function delay(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export const getContentType = (file: string): ContentType => {
  const ext = extname(file).toLowerCase();

  switch (ext) {
    case '.png': {
      return 'image/png';
    }
    case '.log':

    case '.txt': {
      return 'text/plain';
    }

    case '.json': {
      return 'application/json';
    }

    case '.htm':

    case '.html': {
      return 'text/html';
    }

    case '.csv': {
      return 'text/csv';
    }

    case '.xml': {
      return 'application/xml';
    }

    case '.jpeg':

    case '.jpg': {
      return 'image/jpeg';
    }

    case '.mp4': {
      return 'video/mp4';
    }

    case '.svg': {
      return 'image/svg+xml';
    }

    case '.zip':

    case '.pdf': {
      return 'application/zip';
    }

    case '.css': {
      return 'text/css';
    }

    default: {
      return 'application/zip';
    }
  }
};

export const swapItems = (arr: unknown[], index1: number, index2: number) => {
  if (index1 >= arr.length || index2 >= arr.length || index1 < 0 || index2 < 0) {
    return;
  }
  const temp = arr[index1];
  arr[index1] = arr[index2];
  arr[index2] = temp;
};

export const baseUrlFromUrl = (url: string) => {
  const find = '://';
  const findPos = url.indexOf(find) + find.length;
  const indexUrl = url.slice(findPos).indexOf('/');

  return indexUrl === -1 ? `${url}/` : `${url.slice(0, indexUrl + findPos)}/`;
};
