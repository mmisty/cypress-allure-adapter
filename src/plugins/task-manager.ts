import Debug from 'debug';

const debug = Debug('cypress-allure:task-manager');

export class TaskManager {
  private taskQueue: { task: () => Promise<any> }[] = [];
  private isFlushing = false;

  addTask(task: () => Promise<any>): void {
    this.taskQueue.push({ task });
    debug(`Task added to queue, processing started tasks count: ${this.taskQueue.length}`);

    this.processQueue().then(() => {
      debug('Processing finished');
    });
  }

  // Worker function that processes tasks in FIFO order
  async processQueue() {
    if (this.isFlushing) return; // avoid parallel workers
    this.isFlushing = true;

    while (this.taskQueue.length > 0) {
      const { task } = this.taskQueue.shift() ?? {};

      try {
        await task?.();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[cypress-allure-adapter] task failed:', err);
      }
    }

    this.isFlushing = false;
  }

  // Ensure no pending tasks left at the very end
  async flushAllTasks() {
    debug(`All tasks are being flushed, tasks count: ${this.taskQueue.length}`);
    const dateStarted = Date.now();
    const timeout = 60000;

    while (this.taskQueue.length > 0 || this.isFlushing) {
      await new Promise(r => setTimeout(r, 50));

      if (Date.now() - dateStarted > timeout) {
        // eslint-disable-next-line no-console
        console.error(`[cypress-allure-adapter] flushing tasks took too long ${timeout / 1000}sec, exiting:`);
        break;
      }
    }

    return null;
  }

  async flushExistingTasks() {
    debug(`Process existing tasks: ${this.taskQueue.length}`);
    await this.processQueue();

    return null;
  }
}
