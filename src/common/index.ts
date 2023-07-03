export const wsPath = '/__cypress/allure_messages/';
export const ENV_WS = 'allureWsPort';
export const packageLog = '[cypress-allure-adapter]';

export class Message {
  id: number;
  data: any;

  constructor(id: number, data: any) {
    this.id = id;
    this.data = data;
  }
}
export class MessageQueue {
  private messages: Message[] = [];
  length() {
    return this.messages.length;
  }

  enqueue(message: Message) {
    this.messages.push(message);
    this.messages.sort((a, b) => a.id - b.id);
  }

  dequeueAll(): Message[] | undefined {
    return this.messages.splice(0, this.messages.length - 1);
  }
}
