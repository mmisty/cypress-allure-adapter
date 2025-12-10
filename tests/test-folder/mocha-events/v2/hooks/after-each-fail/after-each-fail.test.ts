import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'after-each-fail';

describe('after each hook fail', () => {
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
      expect(test?.statusDetails.message).toContain('fail in after each');
      expect(test?.statusDetails.message).toContain(
        `Because this error occurred during a \`after each\` hook we are skipping the remaining tests in the current suite: \`${rootSuite}\``,
      );
    });

    it('should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: `${rootSuite} -- test 1 -- after each hook (failed).png`,
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('should have before each hooks step with passed status', () => {
      const beforeEachHooks = test?.steps.find(
        s => s.name === '"before each" hooks',
      );
      expect(beforeEachHooks?.status).toEqual('passed');
    });

    it('should have log: test 1 step', () => {
      const logStep = test?.steps.find(s => s.name === 'log: test 1');
      expect(logStep?.status).toEqual('passed');
    });

    it('should have after each hooks step with failed status', () => {
      const afterEachHooks = test?.steps.find(
        s => s.name === '"after each" hooks',
      );
      expect(afterEachHooks?.status).toEqual('failed');
    });

    it('should have failed after each hook step', () => {
      const afterEachHooks = test?.steps.find(
        s => s.name === '"after each" hooks',
      );

      const failedHook = afterEachHooks?.steps.find(
        s => s.name === '"after each" hook' && s.status === 'failed',
      );
      expect(failedHook).toBeDefined();
      expect(failedHook?.steps.map(s => s.name)).toEqual([
        'log: after each',
        'wrap',
      ]);
    });

    describe('parent containers', () => {
      it('should have video in afters', () => {
        const parents = getParentsArray(test);
        const rootParent = parents.find(p => p.name === rootSuite);
        const videoHook = rootParent?.afters?.find(a => a.name === 'video');
        expect(videoHook).toBeDefined();
      });
    });
  });
});
