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

// Special queue ID for cleanup operations that must complete before other queues
export const CLEANUP_QUEUE_ID = '__cleanup__';

class Semaphore {
  private count: number;
  private waiters: Array<{ resolve: () => void; timeoutId: NodeJS.Timeout }> = [];
  private acquireTimeout: number;

  constructor(
    private max: number,
    acquireTimeoutMs = 30000,
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
        logWithPackage('warn', 'Task semaphore acquire timed out - task may run concurrently');
        resolve(false); // Return false to indicate timeout
      }, this.acquireTimeout);

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
 *
 * The cleanup queue (__cleanup__) is special: all other queues wait for it to complete
 * before they start processing.
 */
export class TaskManager {
  private entityQueues = new Map<string, EntityQueue>();
  private semaphore: Semaphore;
  private client: AllureTaskClient | null = null;
  private options: TaskManagerOptions;

  // Cleanup synchronization: other queues wait for cleanup to complete
  private cleanupComplete = false;
  private cleanupPromise: Promise<void> | null = null;
  private cleanupResolve: (() => void) | null = null;

  constructor(options?: TaskManagerOptions) {
    this.options = options ?? {};
    const maxParallel = this.options.maxParallel ?? 5;
    this.semaphore = new Semaphore(maxParallel);
  }

  /**
   * Check if cleanup queue exists and is not yet complete
   */
  private hasCleanupPending(): boolean {
    return !this.cleanupComplete && this.entityQueues.has(CLEANUP_QUEUE_ID);
  }

  /**
   * Wait for cleanup queue to complete (if it exists)
   */
  private async waitForCleanup(): Promise<void> {
    if (this.cleanupComplete || !this.entityQueues.has(CLEANUP_QUEUE_ID)) {
      return;
    }

    if (!this.cleanupPromise) {
      // Create the promise that will resolve when cleanup completes
      this.cleanupPromise = new Promise<void>(resolve => {
        this.cleanupResolve = resolve;
      });
    }

    debug('Waiting for cleanup queue to complete...');
    await this.cleanupPromise;
    debug('Cleanup queue completed, proceeding');
  }

  /**
   * Mark cleanup as complete and notify waiting queues
   */
  private markCleanupComplete(): void {
    this.cleanupComplete = true;

    if (this.cleanupResolve) {
      this.cleanupResolve();
      this.cleanupResolve = null;
    }

    debug('Cleanup marked as complete');
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

    // Non-cleanup queues must wait for cleanup to complete first
    if (entityId !== CLEANUP_QUEUE_ID && this.hasCleanupPending()) {
      await this.waitForCleanup();
    }

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

      // Mark cleanup as complete when the cleanup queue finishes
      if (entityId === CLEANUP_QUEUE_ID) {
        this.markCleanupComplete();
      }
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
