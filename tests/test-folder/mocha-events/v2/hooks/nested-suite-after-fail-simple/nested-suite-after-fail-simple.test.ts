import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'nested-suite-after-fail-simple';

describe('nested suite after hook fail simple', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'true' },
    });
  });

  it('should have 2 tests', () => {
    expect(results.watchResults.length).toEqual(2);
  });

  it('tests should have correct names', () => {
    expect(results.watchResults.map(t => t.fullName).sort()).toEqual([
      `${rootSuite} child suite test 1`,
      `${rootSuite} child suite test 2`,
    ]);
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

    it('should have no direct attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    it('should have correct steps', () => {
      const stepNames = test?.steps.map(s => s.name);
      expect(stepNames).toContain('"before each" hooks');
      expect(stepNames).toContain('log: test 1');
      expect(stepNames).toContain('"after each" hook');
    });
  });

  describe('test 2', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, 'test 2');
    });

    it('should be failed (after hook failure)', () => {
      expect(test?.status).toEqual('failed');
    });

    it('should have correct status message', () => {
      expect(test?.statusDetails.message).toContain('Failure in hook');
      expect(test?.statusDetails.message).toContain(
        'Because this error occurred during a `after all` hook we are skipping the remaining tests in the current suite: `child suite`',
      );
    });

    it('should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: `${rootSuite} -- child suite -- test 2 -- after all hook in sub suite (failed).png`,
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    describe('parent containers', () => {
      it('child suite should have after hook with no direct attachments', () => {
        const parents = getParentsArray(test);
        const childSuite = parents.find(p => p.name === 'child suite');

        const afters = childSuite?.afters?.filter(
          a =>
            a.name?.indexOf('coverage') === -1 &&
            a.name?.indexOf('generateReport') === -1 &&
            a.name !== 'video',
        );

        expect(afters?.map(a => a.name)).toEqual([
          '"after all" hook: in sub suite',
        ]);
        expect(mapAttachments(afters?.[0]?.attachments ?? [])).toEqual([]);
      });

      it('child suite should have after hook steps', () => {
        const parents = getParentsArray(test);
        const childSuite = parents.find(p => p.name === 'child suite');

        const afterHook = childSuite?.afters?.find(
          a => a.name === '"after all" hook: in sub suite',
        );

        expect(afterHook?.steps.map(s => s.name)).toEqual([
          'log: hook pass',
          'wrap',
        ]);
      });
    });
  });
});
