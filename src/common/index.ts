export const wsPath = '/__cypress/allure_messages/';
export const ENV_WS = 'allureWsPort';
export const packageLog = '[cypress-allure-adapter]';

type Message = { data: any; id: number };
/*export class Message {
  data: { any };

  constructor(data: any) {
    this.data = data;
  }
}*/
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
