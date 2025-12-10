import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'nested-suite-before-fail';

describe('nested suite before hook fail', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'true' },
    });
  });

  it('should have 3 tests', () => {
    expect(results.watchResults.length).toEqual(3);
  });

  it('tests should have correct names', () => {
    expect(results.watchResults.map(t => t.fullName).sort()).toEqual([
      `${rootSuite} hooks test - child hooks test - sub child test 1`,
      `${rootSuite} hooks test - child hooks test - sub child test 2`,
      `${rootSuite} test 0`,
    ]);
  });

  describe('test 0', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, 'test 0');
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
        'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `hooks test - sub child`',
      );
    });

    it('should have no direct attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    describe('parent containers', () => {
      it('should have correct parent structure', () => {
        const parents = getParentsArray(test);
        expect(parents.map(p => p.name)).toEqual([
          rootSuite,
          'hooks test - child',
          'hooks test - sub child',
        ]);
      });

      it('sub child should have before hook with screenshot', () => {
        const parents = getParentsArray(test);
        const subChild = parents.find(p => p.name === 'hooks test - sub child');

        const befores = subChild?.befores?.filter(
          b => b.name?.indexOf('coverage') === -1,
        );

        expect(befores?.map(b => b.name)).toEqual([
          '"before all" hook: in sub suite',
        ]);
        expect(mapAttachments(befores?.[0]?.attachments ?? [])).toEqual([
          {
            name: `${rootSuite} -- hooks test - child -- hooks test - sub child -- test 1 -- before all hook in sub suite (failed).png`,
            source: 'source.png',
            type: 'image/png',
          },
        ]);
      });
    });

    describe('labels', () => {
      it('should have correct suite labels', () => {
        const labels = test?.labels.filter(
          l =>
            l.name === 'parentSuite' ||
            l.name === 'suite' ||
            l.name === 'subSuite',
        );
        expect(labels).toEqual([
          { name: 'parentSuite', value: rootSuite },
          { name: 'suite', value: 'hooks test - child' },
          { name: 'subSuite', value: 'hooks test - sub child' },
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
