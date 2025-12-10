import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'nested-suite-pass';

describe('nested suite pass', () => {
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
      `${rootSuite} test 2`,
    ]);
  });

  describe('test 1 (in child suite)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, 'test 1');
    });

    it('should be passed', () => {
      expect(test?.status).toEqual('passed');
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

    describe('parent containers', () => {
      it('should have correct parent structure', () => {
        const parents = getParentsArray(test);
        expect(parents.map(p => p.name)).toEqual([rootSuite, 'child suite']);
      });

      it('root suite should have video in afters', () => {
        const parents = getParentsArray(test);
        const rootParent = parents.find(p => p.name === rootSuite);
        const videoHook = rootParent?.afters?.find(a => a.name === 'video');

        expect(mapAttachments(videoHook?.attachments ?? [])).toEqual([
          {
            name: 'spec.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ]);
      });

      it('child suite should have video in afters', () => {
        const parents = getParentsArray(test);
        const childSuite = parents.find(p => p.name === 'child suite');
        const videoHook = childSuite?.afters?.find(a => a.name === 'video');

        expect(mapAttachments(videoHook?.attachments ?? [])).toEqual([
          {
            name: 'spec.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
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

  describe('test 2 (in root suite)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, 'test 2');
    });

    it('should be passed', () => {
      expect(test?.status).toEqual('passed');
    });

    it('should have correct steps', () => {
      const stepNames = test?.steps.map(s => s.name);
      expect(stepNames).toContain('"before each" hooks');
      expect(stepNames).toContain('log: test 2');
      expect(stepNames).toContain('"after each" hook');
    });

    describe('labels', () => {
      it('should have correct parentSuite label', () => {
        const labels = test?.labels.filter(l => l.name === 'parentSuite');
        expect(labels).toEqual([{ name: 'parentSuite', value: rootSuite }]);
      });
    });
  });
});
