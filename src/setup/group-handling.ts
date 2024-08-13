import { EventEmitter } from 'events';

export class Groups {
  private groups: { id: string; message: string }[] = [];

  constructor(private events: EventEmitter) {}

  public resetGroups() {
    this.groups.splice(0, this.groups.length);
  }

  public handleGroupsEvents() {
    this.events.on('group:started', (message, _id) => {
      Cypress.Allure.startStep(`${message}`);
    });

    this.events.on('group:ended', (_message, _id) => {
      Cypress.Allure.endStep();
    });
  }

  public startGroupMaybe(msg: string): boolean {
    const logGroupIds = (Cypress as any).state('logGroupIds') || [];

    if (logGroupIds.length - this.groups.length === 1) {
      this.events.emit('group:started', msg, logGroupIds[logGroupIds.length - 1]);
      this.groups.push({ id: logGroupIds[logGroupIds.length - 1], message: msg });

      return true;
    }

    return false;
  }

  public endGroupMayBe(msg?: string): boolean {
    const logGroupIds = (Cypress as any).state('logGroupIds') || [];

    if (this.groups.length - logGroupIds.length === 1) {
      this.events.emit('group:ended', msg ?? '', this.groups[this.groups.length - 1].id);
      this.groups.pop();

      return true;
    }

    return false;
  }
}
