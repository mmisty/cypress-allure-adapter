import { EventEmitter } from 'events';

export class EventForwarder {
  private emitter: EventEmitter;
  private task: Cypress.Tasks;
  public on: Cypress.PluginEvents;

  public constructor() {
    this.emitter = new EventEmitter();
    this.task = {};

    this.on = (action, arg) => {
      if (action === 'task') {
        Object.assign(this.task, arg);
      } else {
        this.emitter.on(action, arg as () => void);
      }
    };
  }

  public forward(on: Cypress.PluginEvents): void {
    for (const event of this.emitter.eventNames()) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      on(event as any, async (...args: unknown[]) => {
        for (const listener of this.emitter.listeners(event)) {
          // eslint-disable-next-line no-await-in-loop
          await listener(...args);
        }
      });
    }
    on('task', this.task);
  }
}
