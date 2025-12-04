import Debug from 'debug';
import { logWithPackage } from '../common';
import type { ServerOperation, OperationResult } from './allure-operations';
import { AllureTaskClient } from './allure-task-client';

const debug = Debug('cypress-allure:task-manager');

type TaskFn = () => Promise<unknown>;

interface EntityQueue {
  tasks: Array<TaskFn | ServerOperation>;
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

export interface TaskManagerOptions {
  taskTimeout?: number;
  overallTimeout?: number;
  maxParallel?: number;
}

/**
 * Task Manager
 *
 * Queues and executes tasks. Supports both:
 * - Legacy function-based tasks (executed locally)
 * - Serializable operations (sent to remote server via client)
 */
export class TaskManager {
  private entityQueues = new Map<string, EntityQueue>();
  private semaphore: Semaphore;
  private client: AllureTaskClient | null = null;
  private options: TaskManagerOptions;

  constructor(options?: TaskManagerOptions) {
    this.options = options ?? {};
    const maxParallel = this.options.maxParallel ?? 5;
    this.semaphore = new Semaphore(maxParallel);
  }

  /**
   * Set the client for remote task execution
   */
  setClient(client: AllureTaskClient): void {
    this.client = client;
  }

  /**
   * Add a legacy function-based task
   * @deprecated Use addOperation for new code
   */
  addTask(entityId: string | undefined, task: TaskFn): void {
    if (!entityId) {
      logWithPackage('error', `Cannot start task without entityId set`);
      return;
    }

    let queue = this.entityQueues.get(entityId);
    if (!queue) {
      queue = { tasks: [], isFlushing: false };
      this.entityQueues.set(entityId, queue);
    }

    queue.tasks.push(task);
    debug(`Task added for entity "${entityId}", queue length: ${queue.tasks.length}`);

    if (!queue.isFlushing) {
      this.processQueue(entityId).catch(err => {
        logWithPackage('error', `Entity worker crashed ${entityId}: ${(err as Error).message}`);
      });
    }
  }

  /**
   * Add a serializable operation to be executed on the server
   */
  addOperation(entityId: string | undefined, operation: ServerOperation): void {
    if (!entityId) {
      logWithPackage('error', `Cannot add operation without entityId set`);
      return;
    }

    let queue = this.entityQueues.get(entityId);
    if (!queue) {
      queue = { tasks: [], isFlushing: false };
      this.entityQueues.set(entityId, queue);
    }

    queue.tasks.push(operation);
    debug(`Operation added for entity "${entityId}", queue length: ${queue.tasks.length}`);

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

    if (queue.isFlushing) return;
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

  private async runWithTimeout(task: TaskFn | ServerOperation, entityId: string): Promise<void> {
    const TASK_TIMEOUT = this.options.taskTimeout ?? 30000;
    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        logWithPackage('error', `Task for ${entityId} timed out`);
        reject(new Error('task timeout'));
      }, TASK_TIMEOUT);
    });

    try {
      if (typeof task === 'function') {
        // Legacy function-based task
        await Promise.race([task(), timeoutPromise]);
      } else {
        // Serializable operation - execute via client
        if (this.client) {
          await Promise.race([this.client.execute(task), timeoutPromise]);
        } else {
          logWithPackage('error', 'No client set for operation execution');
        }
      }
    } catch (err) {
      logWithPackage('error', `Task failed for ${entityId}: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async flushAllTasks() {
    debug('Flushing all entity queues');
    const start = Date.now();
    const timeout = this.options.overallTimeout ?? 120000;

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
    const timeout = this.options.overallTimeout ?? 120000;

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
