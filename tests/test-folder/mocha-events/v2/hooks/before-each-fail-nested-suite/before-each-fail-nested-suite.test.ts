import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'before-each-fail-nested-suite';

describe('before each hook fail in nested suite', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'false' },
    });
  });

  it('should have 1 test', () => {
    expect(results.watchResults.length).toEqual(1);
  });

  describe('test 1', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, 'test 1');
    });

    it('should be failed', () => {
      expect(test?.status).toEqual('failed');
    });

    it('should have correct status message', () => {
      expect(test?.statusDetails.message).toContain('fail in before each');
      expect(test?.statusDetails.message).toContain(
        'Because this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `child suite`',
      );
    });

    it('should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: `${rootSuite} -- child suite -- test 1 -- before each hook named before each (failed).png`,
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('should have before each hooks step with failed status', () => {
      const beforeEachHooks = test?.steps.find(
        s => s.name === '"before each" hooks',
      );
      expect(beforeEachHooks?.status).toEqual('failed');
    });

    it('should have failed named before each hook step', () => {
      const beforeEachHooks = test?.steps.find(
        s => s.name === '"before each" hooks',
      );

      const namedHook = beforeEachHooks?.steps.find(
        s => s.name === '"before each" hook: named before each',
      );
      expect(namedHook?.status).toEqual('failed');
      expect(namedHook?.steps.map(s => s.name)).toEqual([
        'log: before each',
        'wrap',
      ]);
    });

    describe('parent containers', () => {
      it('should have correct parent structure', () => {
        const parents = getParentsArray(test);
        expect(parents.map(p => p.name)).toEqual([rootSuite, 'child suite']);
      });

      it('child suite should have video in afters', () => {
        const parents = getParentsArray(test);
        const childSuite = parents.find(p => p.name === 'child suite');
        const videoHook = childSuite?.afters?.find(a => a.name === 'video');
        expect(videoHook).toBeDefined();
      });
    });
  });
});
