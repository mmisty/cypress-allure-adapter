import { expect } from 'expect';
import {
  getTest,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'nested-suite-with-global-hook';

describe('nested suite with global hooks', () => {
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

      it('root suite should have global before hook', () => {
        const parents = getParentsArray(test);
        const rootParent = parents.find(p => p.name === rootSuite);

        const befores = rootParent?.befores?.filter(
          b => b.name?.indexOf('coverage') === -1,
        );

        expect(befores?.map(b => b.name)).toContain(
          '"before all" hook: global before one',
        );
      });

      it('child suite should have global before hook', () => {
        const parents = getParentsArray(test);
        const childSuite = parents.find(p => p.name === 'child suite');

        const befores = childSuite?.befores?.filter(
          b => b.name?.indexOf('coverage') === -1,
        );

        expect(befores?.map(b => b.name)).toContain(
          '"before all" hook: global before one',
        );
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

    describe('parent containers', () => {
      it('root suite should have global before and after hooks', () => {
        const parents = getParentsArray(test);
        const rootParent = parents.find(p => p.name === rootSuite);

        const befores = rootParent?.befores?.filter(
          b => b.name?.indexOf('coverage') === -1,
        );

        const afters = rootParent?.afters?.filter(
          a =>
            a.name?.indexOf('coverage') === -1 &&
            a.name?.indexOf('generateReport') === -1 &&
            a.name !== 'video',
        );

        expect(befores?.map(b => b.name)).toContain(
          '"before all" hook: global before one',
        );
        expect(afters?.map(a => a.name)).toContain(
          '"after all" hook: global after one',
        );
      });
    });

    describe('labels', () => {
      it('should have correct parentSuite label', () => {
        const labels = test?.labels.filter(l => l.name === 'parentSuite');
        expect(labels).toEqual([{ name: 'parentSuite', value: rootSuite }]);
      });
    });
  });
});
