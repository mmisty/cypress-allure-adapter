import Debug from 'debug';
import { logWithPackage } from '../common';

const debug = Debug('cypress-allure:task-manager');
type TaskFn = () => Promise<any>;

interface EntityQueue {
  tasks: TaskFn[];
  isFlushing: boolean;
}

export class TaskManager {
  private entityQueues = new Map<string, EntityQueue>();

  constructor(private options?: { taskTimeout?: number; overallTimeout?: number }) {}

  addTask(entityId: string | undefined, task: TaskFn): void {
    if (!entityId) {
      logWithPackage('error', `Cannot start start without entityId set\n Task: ${task.toString()}`);

      return;
    }

    let queue = this.entityQueues.get(entityId);

    if (!queue) {
      queue = { tasks: [], isFlushing: false };
      this.entityQueues.set(entityId, queue);
    }

    queue.tasks.push(task);
    debug(`Task added for entity "${entityId}", queue length: ${queue.tasks.length}`);

    // Start worker for this entity if not running
    this.processQueue(entityId).catch(err => {
      logWithPackage('error', `entity worker crashed ${entityId}: ${(err as Error).message}`);
    });
  }

  public async processQueue(entityId: string) {
    const queue = this.entityQueues.get(entityId);

    if (!queue) {
      logWithPackage('warn', `tasks for ${entityId} not found`);

      return;
    }

    if (queue.isFlushing) return; // already running
    queue.isFlushing = true;

    const maxParallel = 15;

    while (queue.tasks.length > 0) {
      const runningQueues = [...this.entityQueues.values()].filter(q => q.tasks.length > 0 || q.isFlushing).length;

      if (runningQueues >= maxParallel) {
        await new Promise(r => setTimeout(r, 50));

        continue;
      }
      const task = queue.tasks.shift();

      if (!task) {
        continue;
      }

      const TASK_TIMEOUT = this.options?.taskTimeout ?? 30000;
      let timeoutId: NodeJS.Timeout;

      const timeoutPromise = () =>
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            logWithPackage('error', `task for ${entityId} timed out`);
            reject(new Error('task timeout'));
          }, TASK_TIMEOUT);
        });

      const taskPromise = () =>
        new Promise((res, rej) => {
          return task()
            .then(() => {
              clearTimeout(timeoutId);
              res('done');
            })
            .catch(err => {
              clearTimeout(timeoutId);
              logWithPackage('error', `task failed for ${entityId} ${(err as Error).message}\n${(err as Error).stack}`);
              rej('task error');
            });
        });

      await Promise.race([timeoutPromise(), taskPromise()]).catch(err => {
        logWithPackage('error', `task failed ${entityId}: ${(err as Error).message}`);
        clearTimeout(timeoutId);
      });
    }

    queue.isFlushing = false;
  }

  async flushAllTasks() {
    debug('Flushing all entity queues');
    const start = Date.now();
    const timeout = this.options?.overallTimeout ?? 60000;

    const hasRunningTasks = () => {
      const has = [...this.entityQueues.values()].some(q => q.tasks.length > 0 || q.isFlushing);

      return has;
    };

    while (hasRunningTasks()) {
      await new Promise(r => setTimeout(r, 50));

      if (Date.now() - start > timeout) {
        logWithPackage('error', `flushAllTasks exceeded ${timeout / 1000}s, exiting`);
        break;
      }
    }
  }

  async flushAllTasksForQueue(entityId: string) {
    debug(`Flushing all tasks for queue ${entityId}`);
    const start = Date.now();
    const queue = this.entityQueues.get(entityId);
    const timeout = this.options?.overallTimeout ?? 60000;

    if (!queue) {
      logWithPackage('warn', `tasks for ${entityId} not found`);

      return;
    }

    while (queue.tasks.length > 0 || queue.isFlushing) {
      await new Promise(r => setTimeout(r, 50));

      if (Date.now() - start > timeout) {
        logWithPackage('error', `flushAllTasksForQueue exceeded ${timeout / 1000}s, exiting`);
        break;
      }
    }
  }
}
