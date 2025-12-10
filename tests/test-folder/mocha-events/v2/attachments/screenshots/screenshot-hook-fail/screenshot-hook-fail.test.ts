import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';
import { existsSync } from 'fs';

describe('screenshot when before hook fails', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'false', allureSkipCommands: 'screenshot' },
      allowCyFail: true,
    });
  });

  let test: AllureTest | undefined;

  beforeEach(() => {
    test = getTest(results.watchResults, '01');
  });

  it('test should be defined', () => {
    expect(test).toBeDefined();
  });

  it('test should have failed status', () => {
    expect(test?.status).toEqual('failed');
  });

  it('test should have no direct attachments', () => {
    expect(test?.attachments).toEqual([]);
  });

  describe('parent suite', () => {
    it('should have failed before hook with screenshot attachment', () => {
      const suite = test?.parent;
      expect(suite?.befores?.length).toBeGreaterThanOrEqual(1);

      const failedHook = suite?.befores?.find(
        b => b.status === 'failed' && b.name?.includes('before all'),
      );
      expect(failedHook).toBeDefined();

      expect(mapAttachments(failedHook?.attachments ?? [])).toEqual([
        {
          name: 'screenshot when before hook fails -- 01 test -- before all hook (failed).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('screenshot file should exist', () => {
      const suite = test?.parent;

      const failedHook = suite?.befores?.find(
        b => b.status === 'failed' && b.name?.includes('before all'),
      );
      const source = failedHook?.attachments[0]?.source;
      expect(source).toBeDefined();

      const filePath = `${results.watchDir}/${source}`;
      expect(existsSync(filePath)).toBe(true);
    });

    it('failed hook should have wrap step', () => {
      const suite = test?.parent;

      const failedHook = suite?.befores?.find(
        b => b.status === 'failed' && b.name?.includes('before all'),
      );
      expect(failedHook?.steps.map(s => s.name)).toContain('wrap');
    });

    it('should have video in after hook', () => {
      const suite = test?.parent;
      const videoAfter = suite?.afters?.find(a => a.name === 'video');
      expect(videoAfter).toBeDefined();
      expect(videoAfter?.attachments[0]?.type).toEqual('video/mp4');
    });
  });
});
