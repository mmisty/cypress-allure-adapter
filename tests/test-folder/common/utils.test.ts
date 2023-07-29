import { extname, delay, MessageQueue } from '../../../src/common';

describe('utils', () => {
  it('extname should get ext name', () => {
    expect(extname('ssds.tct')).toEqual('.tct');
  });
  it('extname - should get when folder', () => {
    expect(extname('folder/ssds.tct')).toEqual('.tct');
  });
  it('extname - should return unknown when no dots', () => {
    expect(extname('tct')).toEqual('.unknown');
  });
  it('extname - should return unknown when no dots with folder', () => {
    expect(extname('hello.world/tct')).toEqual('.unknown');
  });

  it('delay', async () => {
    const started = Date.now();
    await delay(100);
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);
  });

  it('messages should be dequeued in the same order as added', async () => {
    const queue = new MessageQueue();

    for (let i = 0; i < 10; i++) {
      queue.enqueue(`added ${i}`);
    }

    expect(queue.dequeueAll()).toEqual([
      { data: 'added 0', id: 1 },
      { data: 'added 1', id: 2 },
      { data: 'added 2', id: 3 },
      { data: 'added 3', id: 4 },
      { data: 'added 4', id: 5 },
      { data: 'added 5', id: 6 },
      { data: 'added 6', id: 7 },
      { data: 'added 7', id: 8 },
      { data: 'added 8', id: 9 },
    ]);
  });
});