import { expect } from 'expect';
import {
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'before-each-retry-fail';

describe('before each retry fail', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'true' },
    });
  });

  it('should have 4 tests (including retry)', () => {
    expect(results.watchResults.length).toEqual(4);
  });

  it('tests should have correct names', () => {
    expect(results.watchResults.map(t => t.fullName).sort()).toEqual([
      `${rootSuite} test 01`,
      `${rootSuite} test 01`,
      `${rootSuite} test 02`,
      `${rootSuite} test 03`,
    ]);
  });

  describe('first test 01 (first attempt)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      const tests = results.watchResults.filter(t => t.name === 'test 01');
      test = tests[0];
    });

    it('should be failed', () => {
      expect(test?.status).toEqual('failed');
    });

    it('should have correct status message', () => {
      expect(test?.statusDetails.message).toContain('BEFORE EACH FAIL');
    });

    it('should have screenshot attachment', () => {
      const attachments = mapAttachments(test?.attachments ?? []);
      expect(attachments.length).toEqual(1);
      expect(attachments[0].name).toContain('failed');
    });
  });

  describe('second test 01 (retry attempt)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      const tests = results.watchResults.filter(t => t.name === 'test 01');
      test = tests[1];
    });

    it('should be failed', () => {
      expect(test?.status).toEqual('failed');
    });

    it('should have correct status message about skipping suite', () => {
      expect(test?.statusDetails.message).toContain('BEFORE EACH FAIL');
      expect(test?.statusDetails.message).toContain(
        'Because this error occurred during a `before each` hook we are skipping the remaining tests in the current suite',
      );
    });

    it('should have screenshot attachment', () => {
      const attachments = mapAttachments(test?.attachments ?? []);
      expect(attachments.length).toEqual(1);
      expect(attachments[0].name).toContain('failed');
      expect(attachments[0].name).toContain('attempt 2');
    });

    it('should have failed before each hook step', () => {
      const beforeEachHooks = test?.steps.find(
        s => s.name === '"before each" hooks',
      );
      expect(beforeEachHooks?.status).toEqual('failed');
    });
  });

  describe('test 02', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = results.watchResults.find(t => t.name === 'test 02');
    });

    it('should be unknown (skipped)', () => {
      expect(test?.status).toEqual('unknown');
    });

    it('should have correct status message', () => {
      expect(test?.statusDetails.message).toContain('BEFORE EACH FAIL');
    });

    it('should have no attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    it('should have no steps', () => {
      expect(test?.steps).toEqual([]);
    });
  });

  describe('test 03', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = results.watchResults.find(t => t.name === 'test 03');
    });

    it('should be unknown (skipped)', () => {
      expect(test?.status).toEqual('unknown');
    });

    it('should have no attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });
  });

  describe('parent containers', () => {
    it('all tests should have video in afters', () => {
      results.watchResults.forEach(test => {
        const parents = getParentsArray(test);
        const rootParent = parents.find(p => p.name === rootSuite);
        const videoHook = rootParent?.afters?.find(a => a.name === 'video');
        expect(videoHook).toBeDefined();
      });
    });
  });
});
