import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

const rootSuite = 'nested-suite-after-pass';

describe('nested suite after hook pass', () => {
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
      it('child suite should have after hook with step', () => {
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
        expect(afters?.[0]?.steps.map(s => s.name)).toEqual(['log: hook pass']);
      });
    });
  });

  describe('test 2', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, 'test 2');
    });

    it('should be passed', () => {
      expect(test?.status).toEqual('passed');
    });

    it('should have after hook with step', () => {
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
      expect(afters?.[0]?.steps.map(s => s.name)).toEqual(['log: hook pass']);
    });
  });
});
