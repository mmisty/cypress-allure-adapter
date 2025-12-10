import { expect } from 'expect';
import {
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'before-each-retry-pass-after-fail';

describe('before each retry pass after fail', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'true' },
    });
  });

  it('should have 6 tests (3 tests x 2 attempts each)', () => {
    expect(results.watchResults.length).toEqual(6);
  });

  it('tests should have correct names', () => {
    expect(results.watchResults.map(t => t.fullName).sort()).toEqual([
      `${rootSuite} test 01`,
      `${rootSuite} test 01`,
      `${rootSuite} test 02`,
      `${rootSuite} test 02`,
      `${rootSuite} test 03`,
      `${rootSuite} test 03`,
    ]);
  });

  describe('test 01 first attempt', () => {
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

  describe('test 01 second attempt (passed)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      const tests = results.watchResults.filter(t => t.name === 'test 01');
      test = tests[1];
    });

    it('should be passed', () => {
      expect(test?.status).toEqual('passed');
    });

    it('should have no status message', () => {
      expect(test?.statusDetails.message).toBeUndefined();
    });

    it('should have no attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    it('should have correct steps', () => {
      const stepNames = test?.steps.map(s => s.name);
      expect(stepNames).toContain('"before each" hooks');
      expect(stepNames).toContain('log: test 1');
      expect(stepNames).toContain('"after each" hook');
    });
  });

  describe('test 02 first attempt', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      const tests = results.watchResults.filter(t => t.name === 'test 02');
      test = tests[0];
    });

    it('should be failed', () => {
      expect(test?.status).toEqual('failed');
    });

    it('should have screenshot attachment', () => {
      const attachments = mapAttachments(test?.attachments ?? []);
      expect(attachments.length).toEqual(1);
      expect(attachments[0].name).toContain('failed');
    });
  });

  describe('test 02 second attempt (passed)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      const tests = results.watchResults.filter(t => t.name === 'test 02');
      test = tests[1];
    });

    it('should be passed', () => {
      expect(test?.status).toEqual('passed');
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
