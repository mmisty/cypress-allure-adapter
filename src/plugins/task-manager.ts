import Debug from 'debug';
import { logWithPackage } from '../common';

const debug = Debug('cypress-allure:task-manager');
type TaskFn = () => Promise<any>;

interface EntityQueue {
  tasks: TaskFn[];
  isFlushing: boolean;
}

class Semaphore {
  private count: number;
  private waiters: (() => void)[] = [];

  constructor(private max: number) {
    this.count = max;
  }

  async acquire() {
    if (this.count > 0) {
      this.count--;

      return;
    }
    await new Promise<void>(resolve => this.waiters.push(resolve));
  }

  release() {
    this.count++;
    const next = this.waiters.shift();

    if (next) {
      this.count--;
      next();
    }
  }
}

export class TaskManager {
  private entityQueues = new Map<string, EntityQueue>();
  private semaphore: Semaphore;

  constructor(private options?: { taskTimeout?: number; overallTimeout?: number; maxParallel?: number }) {
    const maxParallel = this.options?.maxParallel ?? 5;
    this.semaphore = new Semaphore(maxParallel);
  }

  addTask(entityId: string | undefined, task: TaskFn): void {
    if (!entityId) {
      logWithPackage('error', `Cannot start task without entityId set\n Task: ${task.toString()}`);

      return;
    }

    let queue = this.entityQueues.get(entityId);

    if (!queue) {
      queue = { tasks: [], isFlushing: false };
      this.entityQueues.set(entityId, queue);
    }

    queue.tasks.push(task);
    debug(`Task added for entity "${entityId}", queue length: ${queue.tasks.length}`);

    // Trigger processing if not already running
    if (!queue.isFlushing) {
      this.processQueue(entityId).catch(err => {
        logWithPackage('error', `Entity worker crashed ${entityId}: ${(err as Error).message}`);
      });
    }
  }

  public async processQueue(entityId: string) {
    const queue = this.entityQueues.get(entityId);

    if (!queue) {
      logWithPackage('warn', `Tasks for ${entityId} not found`);

      return;
    }

    if (queue.isFlushing) return; // Prevent concurrent runs for same queue
    queue.isFlushing = true;

    try {
      while (queue.tasks.length > 0) {
        const task = queue.tasks.shift();
        if (!task) continue;

        await this.semaphore.acquire();

        try {
          await this.runWithTimeout(task, entityId);
        } finally {
          this.semaphore.release();
        }
      }
    } catch (err) {
      logWithPackage('error', `Queue error for ${entityId}: ${(err as Error).message}`);
    } finally {
      queue.isFlushing = false;
    }
  }

  private async runWithTimeout(task: TaskFn, entityId: string): Promise<void> {
    const TASK_TIMEOUT = this.options?.taskTimeout ?? 30000;
    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        logWithPackage('error', `Task for ${entityId} timed out`);
        reject(new Error('task timeout'));
      }, TASK_TIMEOUT);
    });

    try {
      await Promise.race([task(), timeoutPromise]);
    } catch (err) {
      logWithPackage('error', `Task failed for ${entityId}: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async flushAllTasks() {
    debug('Flushing all entity queues');
    const start = Date.now();
    const timeout = this.options?.overallTimeout ?? 120000;

    const hasRunningTasks = () => [...this.entityQueues.values()].some(q => q.tasks.length > 0 || q.isFlushing);

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
      logWithPackage('warn', `Tasks for ${entityId} not found`);

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
