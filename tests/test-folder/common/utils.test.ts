import {
  extname,
  delay,
  MessageQueue,
  basename,
  getContentType,
  swapItems,
  baseUrlFromUrl,
} from '../../../src/common';

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

  it('basename file path', () => {
    expect(basename('hello.world/tct.txt')).toEqual('tct.txt');
  });

  it('basename file', () => {
    expect(basename('tct.txt')).toEqual('tct.txt');
  });

  describe('getContentType', () => {
    its('content')
      .each([
        { input: 'd', expected: 'application/zip' },
        { input: 'unknown', expected: 'application/zip' },
        { input: 'myfile.txt', expected: 'text/plain' },
        { input: 'hello/myfile.txt', expected: 'text/plain' },
        { input: 'hello/myfile.csv', expected: 'text/csv' },
        { input: 'hello/myfile.png', expected: 'image/png' },
        { input: 'hello/myfile.log', expected: 'text/plain' },
        { input: 'hello/myfile.json', expected: 'application/json' },
        { input: 'hello/myfile.htm', expected: 'text/html' },
        { input: 'hello/myfile.html', expected: 'text/html' },
        { input: 'hello/myfile.xml', expected: 'application/xml' },
        { input: 'hello/myfile.jpg', expected: 'image/jpeg' },
        { input: 'hello/myfile.jpeg', expected: 'image/jpeg' },
        { input: 'hello/myfile.mp4', expected: 'video/mp4' },
        { input: 'hello/myfile.svg', expected: 'image/svg+xml' },
        { input: 'hello/myfile.pdf', expected: 'application/zip' },
        { input: 'hello/myfile.zip', expected: 'application/zip' },
        { input: 'hello/myfile.css', expected: 'text/css' },
      ])
      .run(t => {
        expect(getContentType(t.input)).toEqual(t.expected);
      });
  });

  it('delay', async () => {
    const started = Date.now();
    await delay(100);
    expect(Date.now() - started).toBeGreaterThanOrEqual(99); // sometime has 99 instead of 100
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
      { data: 'added 9', id: 10 },
    ]);
  });

  describe('swap', () => {
    it('swap items 1', () => {
      const arr = ['0', '1', '2'];
      swapItems(arr, 0, 1);
      expect(arr).toEqual(['1', '0', '2']);
    });

    it('swap items 2', () => {
      const arr = ['0', '1', '2'];
      swapItems(arr, 0, 2);
      expect(arr).toEqual(['2', '1', '0']);
    });

    it('swap items - incorrect indeces > length 1', () => {
      const arr = ['0', '1', '2'];
      swapItems(arr, 0, 3);
      expect(arr).toEqual(['0', '1', '2']);
    });

    it('swap items - incorrect indeces > length 2', () => {
      const arr = ['0', '1', '2'];
      swapItems(arr, 3, 0);
      expect(arr).toEqual(['0', '1', '2']);
    });

    it('swap items - incorrect indeces < 0 (1)', () => {
      const arr = ['0', '1', '2'];
      swapItems(arr, -1, 2);
      expect(arr).toEqual(['0', '1', '2']);
    });

    it('swap items - incorrect indeces < 0 (2)', () => {
      const arr = ['0', '1', '2'];
      swapItems(arr, 0, -3);
      expect(arr).toEqual(['0', '1', '2']);
    });
  });

  describe('url', () => {
    it('browserUrl with slashes', () => {
      const browserUrl = 'http://localhost:52013/api/123';

      expect(baseUrlFromUrl(browserUrl)).toEqual('http://localhost:52013/');
    });

    it('browserUrl no slashes', () => {
      const browserUrl = 'http://localhost:52013/';

      expect(baseUrlFromUrl(browserUrl)).toEqual('http://localhost:52013/');
    });

    it('browserUrl no slashes 2', () => {
      const browserUrl = 'http://localhost:52013';

      expect(baseUrlFromUrl(browserUrl)).toEqual('http://localhost:52013/');
    });
  });
});
