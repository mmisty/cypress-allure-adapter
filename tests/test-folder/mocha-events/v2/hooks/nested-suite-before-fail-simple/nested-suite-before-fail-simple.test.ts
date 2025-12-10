import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'nested-suite-before-fail-simple';

describe('nested suite before hook fail simple', () => {
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

    it('should be failed', () => {
      expect(test?.status).toEqual('failed');
    });

    it('should have correct status message', () => {
      expect(test?.statusDetails.message).toContain('Failure in hook');
      expect(test?.statusDetails.message).toContain(
        'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `child suite`',
      );
    });

    it('should have no direct attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    describe('parent containers', () => {
      it('child suite should have before hook with screenshot', () => {
        const parents = getParentsArray(test);
        const childSuite = parents.find(p => p.name === 'child suite');

        const befores = childSuite?.befores?.filter(
          b => b.name?.indexOf('coverage') === -1,
        );

        expect(befores?.map(b => b.name)).toEqual([
          '"before all" hook: in sub suite',
        ]);
        expect(mapAttachments(befores?.[0]?.attachments ?? [])).toEqual([
          {
            name: `${rootSuite} -- child suite -- test 1 -- before all hook in sub suite (failed).png`,
            source: 'source.png',
            type: 'image/png',
          },
        ]);
      });

      it('child suite should have before hook steps', () => {
        const parents = getParentsArray(test);
        const childSuite = parents.find(p => p.name === 'child suite');

        const beforeHook = childSuite?.befores?.find(
          b => b.name === '"before all" hook: in sub suite',
        );

        expect(beforeHook?.steps.map(s => s.name)).toEqual([
          'log: hook pass',
          'wrap',
        ]);
      });
    });

    describe('labels', () => {
      it('should have correct suite labels', () => {
        const labels = test?.labels.filter(
          l => l.name === 'parentSuite' || l.name === 'suite',
        );
        expect(labels).toEqual([
          { name: 'parentSuite', value: rootSuite },
          { name: 'suite', value: 'child suite' },
        ]);
      });
    });
  });

  describe('test 2', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, 'test 2');
    });

    it('should be unknown (skipped)', () => {
      expect(test?.status).toEqual('unknown');
    });

    it('should have correct status message', () => {
      expect(test?.statusDetails.message).toContain('Failure in hook');
    });
  });
});
