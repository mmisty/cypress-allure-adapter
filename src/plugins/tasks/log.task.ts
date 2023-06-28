import type { TaskType } from './types';

/**
 * logs to node
 * @param message
 */
export const logTask: TaskType<string> = (message: string) => {
  console.log(message);

  return null;
};
