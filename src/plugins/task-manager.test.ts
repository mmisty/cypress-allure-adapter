import { TaskManager } from '../plugins/task-manager';
import { delay } from '../common';
import expect from 'expect';
import { consoleMock } from '../../tests/mocks/console-mock';

describe('task manager', () => {
  let cons: ReturnType<typeof consoleMock> | undefined;
  beforeEach(() => {
    cons = consoleMock();
    jest.clearAllMocks();
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
    expect(cons?.error.mock.calls[0][0]).toContain('[cypress-allure-adapter] Cannot start task without entityId');
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
    expect(cons?.error.mock.calls[0][0]).toContain('Task for spec1 timed out');
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
    expect(cons?.error.mock.calls[0][0]).toContain('Task failed for spec1: Failed TASK');
  });

  it('should continue other tasks when one timed out', async () => {
    const logs: string[] = [];
    const tm = new TaskManager({ taskTimeout: 100 });

    tm.addTask('spec1', async () => {
      await delay(200);
      throw new Error('Failed TASK');
    });

    tm.addTask('spec1', async () => {
      await delay(50);
      logs.push('spec1 - 2');
    });

    await tm.flushAllTasks();
    expect(logs).toEqual(['spec1 - 2']);
    expect(cons?.error.mock.calls[0][0]).toContain('Task for spec1 timed out');
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

  it('should flushAllTasksForQueue even when all already finished', async () => {
    const logs: string[] = [];
    const tm = new TaskManager();

    tm.addTask('spec1', async () => {
      logs.push('task 1');
    });

    tm.addTask('spec1', async () => {
      logs.push('task 2');
    });

    tm.addTask('spec1', async () => {
      logs.push('task 3');
      await delay(100); // to process
      logs.push('task 3 end');
    });

    await delay(200); // to finish all

    await tm.flushAllTasksForQueue('spec1').then(() => {
      logs.push('end');
    });
    expect(logs).toEqual(['task 1', 'task 2', 'task 3', 'task 3 end', 'end']);
  });

  it('should flushAllTasksForQueue even when tasks in progress', async () => {
    const logs: string[] = [];
    const tm = new TaskManager();

    tm.addTask('spec1', async () => {
      logs.push('task 1');
    });

    tm.addTask('spec1', async () => {
      logs.push('task 2');
    });

    tm.addTask('spec1', async () => {
      logs.push('task 3');
      await delay(100); // to process
      logs.push('task 3 end');
    });

    await tm.flushAllTasksForQueue('spec1').then(() => {
      logs.push('end');
    });
    expect(logs).toEqual(['task 1', 'task 2', 'task 3', 'task 3 end', 'end']);
  });

  const addTasks = (tm: TaskManager, logs: string[], id: string, num: number, delayMs: number) => {
    for (let i = 0; i < num; i++) {
      tm.addTask(id, async () => {
        logs.push(`${id} started task ${i}`);
        await delay(delayMs); // to process
        logs.push(`${id} ended task ${i}`);
      });
    }
  };

  it('should stop all when overall timeout and many tasks', async () => {
    const logs: string[] = [];
    const tm = new TaskManager({ overallTimeout: 100 });
    addTasks(tm, logs, 'spec1', 4, 10);
    addTasks(tm, logs, 'spec2', 4, 10);
    addTasks(tm, logs, 'spec3', 4, 10);
    addTasks(tm, logs, 'spec4', 4, 10);
    addTasks(tm, logs, 'spec5', 4, 10);
    addTasks(tm, logs, 'spec6', 4, 10);
    addTasks(tm, logs, 'spec7', 4, 10);
    addTasks(tm, logs, 'spec8', 4, 10);
    addTasks(tm, logs, 'spec9', 4, 10);
    addTasks(tm, logs, 'spec10', 4, 10);
    addTasks(tm, logs, 'spec11', 4, 10);
    await tm.flushAllTasksForQueue('spec2');

    expect(cons?.error.mock.calls[0][0]).toEqual(
      '[cypress-allure-adapter] flushAllTasksForQueue exceeded 0.1s, exiting',
    );
  });

  it('should process more than max queues', async () => {
    const logs: string[] = [];
    const tm = new TaskManager();

    addTasks(tm, logs, 'spec1', 3, 10);
    addTasks(tm, logs, 'spec2', 3, 10);
    addTasks(tm, logs, 'spec3', 3, 10);
    addTasks(tm, logs, 'spec4', 3, 10);
    addTasks(tm, logs, 'spec5', 3, 10);
    addTasks(tm, logs, 'spec6', 3, 10);
    addTasks(tm, logs, 'spec7', 3, 10);

    tm.flushAllTasksForQueue('spec1').then(() => {
      logs.push('spec1 end');
    });
    tm.flushAllTasksForQueue('spec2').then(() => {
      logs.push('spec2 end');
    });
    tm.flushAllTasksForQueue('spec3').then(() => {
      logs.push('spec3 end');
    });
    tm.flushAllTasksForQueue('spec4').then(() => {
      logs.push('spec4 end');
    });
    tm.flushAllTasksForQueue('spec5').then(() => {
      logs.push('spec5 end');
    });
    tm.flushAllTasksForQueue('spec6').then(() => {
      logs.push('spec6 end');
    });
    tm.flushAllTasksForQueue('spec7').then(() => {
      logs.push('spec7 end');
    });
    await tm.flushAllTasks();
    expect(logs).toEqual([
      'spec1 started task 0',
      'spec2 started task 0',
      'spec3 started task 0',
      'spec4 started task 0',
      'spec5 started task 0',
      'spec1 ended task 0',
      'spec6 started task 0',
      'spec2 ended task 0',
      'spec7 started task 0',
      'spec3 ended task 0',
      'spec1 started task 1',
      'spec4 ended task 0',
      'spec2 started task 1',
      'spec5 ended task 0',
      'spec3 started task 1',
      'spec6 ended task 0',
      'spec4 started task 1',
      'spec7 ended task 0',
      'spec5 started task 1',
      'spec1 ended task 1',
      'spec6 started task 1',
      'spec2 ended task 1',
      'spec7 started task 1',
      'spec3 ended task 1',
      'spec1 started task 2',
      'spec4 ended task 1',
      'spec2 started task 2',
      'spec5 ended task 1',
      'spec3 started task 2',
      'spec6 ended task 1',
      'spec4 started task 2',
      'spec7 ended task 1',
      'spec5 started task 2',
      'spec1 ended task 2',
      'spec6 started task 2',
      'spec2 ended task 2',
      'spec7 started task 2',
      'spec3 ended task 2',
      'spec4 ended task 2',
      'spec5 ended task 2',
      'spec6 ended task 2',
      'spec1 end',
      'spec2 end',
      'spec3 end',
      'spec4 end',
      'spec5 end',
      'spec6 end',
      'spec7 ended task 2',
      'spec7 end',
    ]);
  });
});
