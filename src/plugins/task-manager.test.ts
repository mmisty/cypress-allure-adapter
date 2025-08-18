import { TaskManager } from '../plugins/task-manager';
import { delay } from '../common';
import expect from 'expect';
import { consoleMock } from '../../tests/mocks/console-mock';

describe('task manager', () => {
  let cons: ReturnType<typeof consoleMock> | undefined;
  beforeEach(() => {
    // cons; //= //consoleMock();
  });

  it('should not start when no id', async () => {
    const logs: string[] = [];
    const tm = new TaskManager({ taskTimeout: 200 });

    tm.addTask(undefined, async () => {
      await delay(100);
      logs.push('1');
    });
    await tm.flushAllTasks();
    expect(logs).toEqual([]);
    expect(cons?.error.mock.calls[0][0]).toContain('[cypress-allure-adapter] Cannot start start without entityId');
  });

  it('should do tasks in order', async () => {
    const logs: string[] = [];
    const tm = new TaskManager({ taskTimeout: 200 });

    tm.addTask('spec1', async () => {
      await delay(100);
      logs.push('1');
    });

    tm.addTask('spec1', () => {
      logs.push('2');

      return Promise.resolve();
    });

    tm.addTask('spec2', async () => {
      await delay(50);
      logs.push('3');

      return Promise.resolve();
    });
    await tm.flushAllTasks();

    tm.addTask('spec1', async () => {
      await delay(100);
      logs.push('4');

      return Promise.resolve();
    });

    await tm.flushAllTasks();

    expect(logs).toEqual(['3', '1', '2', '4']);
  });

  it('should timeout task', async () => {
    const logs: string[] = [];
    const tm = new TaskManager({ taskTimeout: 100 });

    tm.addTask('spec1', async () => {
      await delay(50);
      logs.push('spec1 - 1');
    });

    tm.addTask('spec1', async () => {
      await delay(200);
      logs.push('spec1 - 2');
    });

    tm.addTask('spec2', async () => {
      await delay(40);
      logs.push('spec2 - 1');
    });

    expect(logs).toEqual([]);
    await tm.flushAllTasks();
    expect(logs).toEqual(['spec2 - 1', 'spec1 - 1']);
    expect(cons?.error.mock.calls[0][0]).toContain('task for spec1 timed out');
  });

  it('should continue other tasks when one failed', async () => {
    const logs: string[] = [];
    const tm = new TaskManager({ taskTimeout: 1000 });

    tm.addTask('spec1', async () => {
      await delay(50);
      throw new Error('Failed TASK');
    });

    tm.addTask('spec1', async () => {
      await delay(100);
      logs.push('spec1 - 2');
    });

    await tm.flushAllTasks();
    expect(logs).toEqual(['spec1 - 2']);
    expect(cons?.error.mock.calls[0][0]).toContain('task failed for spec1 Failed TASK');
  });

  it('should continue other tasks when one timed out', async () => {
    const logs: string[] = [];
    const tm = new TaskManager({ taskTimeout: 100 });

    tm.addTask('spec1', async () => {
      await delay(200);
      throw new Error('Failed TASK');
    });

    tm.addTask('spec1', async () => {
      await delay(100);
      logs.push('spec1 - 2');
    });

    await tm.flushAllTasks();
    expect(logs).toEqual(['spec1 - 2']);
    expect(cons?.error.mock.calls[0][0]).toContain('task for spec1 timed out');
  });

  it('should stop all when overall timeout', async () => {
    const logs: string[] = [];
    const tm = new TaskManager({ overallTimeout: 300 });
    tm.addTask('spec1', async () => {
      await delay(200);
      logs.push('spec1 - 2');
    });

    tm.addTask('spec1', async () => {
      await delay(200);
      logs.push('spec1 - 2');
    });

    tm.addTask('spec1', async () => {
      await delay(200);
      logs.push('spec1 - 3');
    });

    tm.addTask('spec2', async () => {
      await delay(250);
      logs.push('spec1 - 3');
    });

    await tm.flushAllTasks();

    expect(logs).toEqual(['spec1 - 2', 'spec1 - 3']);
    expect(cons?.error.mock.calls[0][0]).toContain('flushAllTasks exceeded 0.3s, exiting');
  });

  it('should flushAllTasksForQueue', async () => {
    const logs: string[] = [];
    const tm = new TaskManager();

    tm.addTask('spec1', async () => {
      logs.push('spec1 - 1');
    });
    await delay(100); // to process

    tm.addTask('spec1', async () => {
      logs.push('spec1 - 2');
    });

    tm.addTask('spec1', async () => {
      logs.push('spec1 - 3');
      await delay(1000);
      logs.push('spec1 - 3 end');
    });

    await tm.flushAllTasksForQueue('spec1');
    expect(logs).toEqual(['spec1 - 1', 'spec1 - 2', 'spec1 - 3']);
    expect(cons?.error.mock.calls.length).toEqual(0);
  });
});
