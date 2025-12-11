import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';

const rootSuite = 'before-each-pass';

describe('before each hook pass', () => {
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

    it('should have before each hook step with log', () => {
      const beforeEachHooks = test?.steps.find(
        s => s.name === '"before each" hooks',
      );

      const hookSteps = beforeEachHooks?.steps.filter(
        s => s.name === '"before each" hook',
      );

      // Second one should have the log step
      const hookWithLog = hookSteps?.find(h =>
        h.steps.some(s => s.name === 'log: no name hook - before each'),
      );
      expect(hookWithLog).toBeDefined();
    });

    describe('labels', () => {
      it('should have correct parentSuite label', () => {
        const labels = test?.labels.filter(l => l.name === 'parentSuite');
        expect(labels).toEqual([{ name: 'parentSuite', value: rootSuite }]);
      });
    });
  });
});
