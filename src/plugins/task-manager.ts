import Debug from 'debug';
import { logWithPackage } from '../common';
import type { ServerOperation } from './allure-operations';
import { AllureTaskClient } from './allure-task-client';

const debug = Debug('cypress-allure:task-manager');

type TaskFn = () => Promise<unknown>;

interface EntityQueue {
  tasks: Array<TaskFn | ServerOperation>;
  isFlushing: boolean;
}

class Semaphore {
  private count: number;
  private waiters: Array<{ resolve: () => void; timeoutId: NodeJS.Timeout }> = [];
  private acquireTimeout: number;

  constructor(
    private max: number,
    acquireTimeoutMs = 5000, // Reduced from 30s to 5s to prevent long waits
  ) {
    this.count = max;
    this.acquireTimeout = acquireTimeoutMs;
  }

  async acquire(): Promise<boolean> {
    if (this.count > 0) {
      this.count--;

      return true;
    }

    // Wait with timeout to prevent indefinite blocking
    return new Promise<boolean>(resolve => {
      const timeoutId = setTimeout(() => {
        // Remove this waiter from the queue
        const index = this.waiters.findIndex(w => w.timeoutId === timeoutId);

        if (index !== -1) {
          this.waiters.splice(index, 1);
        }
        debug('Semaphore acquire timed out, continuing without blocking');
        // Don't log warning - just proceed (reduced timeout makes this expected)
        resolve(false); // Return false to indicate timeout
      }, this.acquireTimeout);

      // Unref the timeout so it doesn't keep Node alive
      if (timeoutId.unref) {
        timeoutId.unref();
      }

      this.waiters.push({
        resolve: () => {
          clearTimeout(timeoutId);
          resolve(true);
        },
        timeoutId,
      });
    });
  }

  release() {
    this.count++;
    const next = this.waiters.shift();

    if (next) {
      this.count--;
      clearTimeout(next.timeoutId);
      next.resolve();
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
    // Increased from 5 to 10 - tasks are I/O bound so more parallelism is beneficial
    const maxParallel = this.options.maxParallel ?? 10;
    this.semaphore = new Semaphore(maxParallel);
  }

  /**
   * Set the client for remote task execution
   */
  setClient(client: AllureTaskClient): void {
    this.client = client;
  }

  /**
   * Schedule queue processing on next tick (deferred to not block current execution)
   */
  private scheduleProcessQueue(entityId: string): void {
    const queue = this.entityQueues.get(entityId);

    if (queue && !queue.isFlushing) {
      // Use setImmediate to defer processing to next event loop tick
      // This allows other events (like browser connection) to be processed first
      setImmediate(() => {
        this.processQueue(entityId).catch(err => {
          logWithPackage('error', `Entity worker crashed ${entityId}: ${(err as Error).message}`);
        });
      });
    }
  }

  /**
   * Add a legacy function-based task
   * @deprecated Use addOperation for new code
   */
  addTask(entityId: string | undefined, task: TaskFn): void {
    if (!entityId) {
      logWithPackage('error', 'Cannot start task without entityId set');

      return;
    }

    let queue = this.entityQueues.get(entityId);

    if (!queue) {
      queue = { tasks: [], isFlushing: false };
      this.entityQueues.set(entityId, queue);
    }

    queue.tasks.push(task);
    debug(`Task added for entity "${entityId}", queue length: ${queue.tasks.length}`);

    this.scheduleProcessQueue(entityId);
  }

  /**
   * Add a serializable operation to be executed on the server
   */
  addOperation(entityId: string | undefined, operation: ServerOperation): void {
    if (!entityId) {
      logWithPackage('error', 'Cannot add operation without entityId set');

      return;
    }

    let queue = this.entityQueues.get(entityId);

    if (!queue) {
      queue = { tasks: [], isFlushing: false };
      this.entityQueues.set(entityId, queue);
    }

    queue.tasks.push(operation);
    debug(`Operation added for entity "${entityId}", queue length: ${queue.tasks.length}`);

    this.scheduleProcessQueue(entityId);
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

        // Yield to event loop after each task to allow other events to be processed
        // This prevents blocking Cypress browser connection events
        await new Promise(resolve => setImmediate(resolve));
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

    const getRunningInfo = () => {
      let totalTasks = 0;
      let flushingQueues = 0;

      for (const q of this.entityQueues.values()) {
        totalTasks += q.tasks.length;

        if (q.isFlushing) flushingQueues++;
      }

      return { totalTasks, flushingQueues, hasRunning: totalTasks > 0 || flushingQueues > 0 };
    };

    let info = getRunningInfo();

    // Log initial state
    if (info.hasRunning) {
      debug(`Waiting for ${info.totalTasks} tasks in ${info.flushingQueues} queues`);
    }

    // Use longer polling interval to reduce event loop churn (was 50ms)
    const POLL_INTERVAL = 200;

    while (info.hasRunning) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
      info = getRunningInfo();

      if (Date.now() - start > timeout) {
        logWithPackage(
          'error',
          `flushAllTasks exceeded ${timeout / 1000}s, exiting (${info.totalTasks} tasks remaining)`,
        );
        break;
      }
    }

    debug(`All tasks flushed in ${Date.now() - start}ms`);
  }

  async flushAllTasksForQueue(entityId: string) {
    debug(`Flushing all tasks for queue ${entityId}`);
    const start = Date.now();
    const queue = this.entityQueues.get(entityId);
    const timeout = this.options.overallTimeout ?? 120000;

    if (!queue) {
      debug(`Tasks for ${entityId} not found (queue may not exist yet)`);

      return;
    }

    const initialTasks = queue.tasks.length;

    if (initialTasks > 0) {
      debug(`Waiting for ${initialTasks} tasks in queue ${entityId}`);
    }

    // Use longer polling interval to reduce event loop churn (was 50ms)
    const POLL_INTERVAL = 200;

    while (queue.tasks.length > 0 || queue.isFlushing) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL));

      if (Date.now() - start > timeout) {
        logWithPackage(
          'error',
          `flushAllTasksForQueue exceeded ${timeout / 1000}s, exiting (${queue.tasks.length} tasks remaining)`,
        );
        break;
      }
    }

    debug(`Queue ${entityId} flushed in ${Date.now() - start}ms`);
  }
}
