import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  mapSteps,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';
import { existsSync, readFileSync } from 'fs';

describe('screenshot command', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'false' },
    });
  });

  let testWithName: AllureTest | undefined;
  let testNoName: AllureTest | undefined;

  beforeEach(() => {
    testWithName = getTest(results.watchResults, 'screenshot test 01');
    testNoName = getTest(results.watchResults, 'screenshot test no name 02');
  });

  describe('screenshot with name', () => {
    it('test should be defined', () => {
      expect(testWithName).toBeDefined();
    });

    it('test should have screenshot attachment', () => {
      expect(mapAttachments(testWithName?.attachments ?? [])).toEqual([
        {
          name: 'my-test.png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('screenshot file should exist', () => {
      const source = testWithName?.attachments[0]?.source;
      expect(source).toBeDefined();
      const filePath = `${results.watchDir}/${source}`;
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath).length).toBeGreaterThan(0);
    });

    it('should have proper steps', () => {
      const steps = mapSteps(
        testWithName?.steps ?? [],
        t => ({ name: t.name, attachments: t.attachments }),
        t =>
          t.name?.indexOf('before each') === -1 &&
          t.name?.indexOf('after each') === -1,
      );

      expect(steps).toEqual([
        {
          name: 'task: log, message',
          attachments: [],
          steps: [],
        },
        {
          name: 'screenshot: my-test',
          attachments: [],
          steps: [],
        },
      ]);
    });
  });

  describe('screenshot without name', () => {
    it('test should be defined', () => {
      expect(testNoName).toBeDefined();
    });

    it('test should have screenshot attachment with auto-generated name', () => {
      expect(mapAttachments(testNoName?.attachments ?? [])).toEqual([
        {
          name: 'test screenshot -- screenshot test no name 02.png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('screenshot file should exist', () => {
      const source = testNoName?.attachments[0]?.source;
      expect(source).toBeDefined();
      const filePath = `${results.watchDir}/${source}`;
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath).length).toBeGreaterThan(0);
    });

    it('should have proper steps', () => {
      const steps = mapSteps(
        testNoName?.steps ?? [],
        t => ({ name: t.name, attachments: t.attachments }),
        t =>
          t.name?.indexOf('before each') === -1 &&
          t.name?.indexOf('after each') === -1,
      );

      expect(steps).toEqual([
        {
          name: 'task: log, message',
          attachments: [],
          steps: [],
        },
        {
          name: 'screenshot',
          attachments: [],
          steps: [],
        },
      ]);
    });
  });
});
