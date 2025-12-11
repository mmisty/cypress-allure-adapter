import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'before-after-failure';

describe('before and after hooks failure', () => {
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
      `${rootSuite} test 1`,
      `${rootSuite} test 2`,
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
      expect(test?.statusDetails.message).toContain('Failure in before hook');
    });

    it('should have no direct attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    describe('parent containers', () => {
      it('should have before hook with screenshot', () => {
        const parents = getParentsArray(test);
        const suiteParent = parents.find(p => p.name === rootSuite);

        const befores = suiteParent?.befores?.filter(
          b => b.name?.indexOf('coverage') === -1,
        );

        expect(befores?.map(b => b.name)).toEqual([
          '"before all" hook: in suite',
        ]);
        expect(mapAttachments(befores?.[0]?.attachments ?? [])).toEqual([
          {
            name: `${rootSuite} -- test 1 -- before all hook in suite (failed).png`,
            source: 'source.png',
            type: 'image/png',
          },
        ]);
      });

      it('should have after hook with screenshot', () => {
        const parents = getParentsArray(test);
        const suiteParent = parents.find(p => p.name === rootSuite);

        const afters = suiteParent?.afters?.filter(
          a =>
            a.name?.indexOf('coverage') === -1 &&
            a.name?.indexOf('generateReport') === -1,
        );

        expect(afters?.map(a => a.name)).toContain(
          '"after all" hook: after in suite',
        );

        const afterHook = afters?.find(
          a => a.name === '"after all" hook: after in suite',
        );
        expect(mapAttachments(afterHook?.attachments ?? [])).toEqual([
          {
            name: `${rootSuite} -- test 1 -- after all hook after in suite (failed).png`,
            source: 'source.png',
            type: 'image/png',
          },
        ]);
      });

      it('should have video attachment', () => {
        const parents = getParentsArray(test);
        const suiteParent = parents.find(p => p.name === rootSuite);
        const videoHook = suiteParent?.afters?.find(a => a.name === 'video');

        expect(mapAttachments(videoHook?.attachments ?? [])).toEqual([
          {
            name: 'spec.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
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
      expect(test?.statusDetails.message).toContain('Failure in before hook');
    });
  });

  describe('labels', () => {
    it('test 1 should have correct parentSuite label', () => {
      const test = getTest(results.watchResults, 'test 1');

      const parentSuiteLabels = test?.labels.filter(
        l => l.name === 'parentSuite',
      );
      expect(parentSuiteLabels?.[0]?.value).toEqual(rootSuite);
    });

    it('test 2 should have correct parentSuite label', () => {
      const test = getTest(results.watchResults, 'test 2');

      const parentSuiteLabels = test?.labels.filter(
        l => l.name === 'parentSuite',
      );
      expect(parentSuiteLabels?.[0]?.value).toEqual(rootSuite);
    });
  });
});
