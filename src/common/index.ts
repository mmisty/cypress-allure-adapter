import Debug from 'debug';

export const wsPath = '/__cypress/allure_messages/';
export const ENV_WS = 'allureWsPort';
export const packageLog = '[cypress-allure-adapter]';

const debug = Debug('cypress-allure:delay');

type Message = { data: any; id: number };

export class MessageQueue {
  private id = 0;
  private messages: Message[] = [];
  length() {
    return this.messages.length;
  }

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

export async function delay(ms: number, ...messages: string[]) {
  debug([...messages, messages.length > 0 ? ':' : '', `DELAY ${ms.toString()} ms`]);
  await new Promise(resolve => setTimeout(resolve, ms));
}
