export const wsPath = '/__cypress/allure_messages/';
export const ENV_WS = 'allureWsPort';
export const packageLog = '[cypress-allure-adapter]';

type Message = { data: any; id: number };

export class MessageQueue {
  private id = 0;
  private messages: Message[] = [];

  enqueue(data: any) {
    this.id++;
    const message: Message = { data, id: this.id };
    this.messages.push(message);
    this.messages.sort((a, b) => a.id - b.id);
  }

  dequeueAll(): Message[] | undefined {
    return this.messages.splice(0, this.messages.length - 1);
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

  const prefix = type === 'tms' ? env['tmsPrefix'] ?? '' : env['issuePrefix'] ?? '';

  if (prefix.indexOf('*') !== -1) {
    return prefix.replace('*', value);
  }

  const prefixFixed = prefix.endsWith('/') ? prefix.slice(0, prefix.length - 1) : prefix;

  return `${prefixFixed}/${value}`;
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
