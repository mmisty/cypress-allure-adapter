import Tasks = Cypress.Tasks;
import { logTask } from './tasks/log.task';

export const tasks: Tasks = {
  log: logTask,
};
