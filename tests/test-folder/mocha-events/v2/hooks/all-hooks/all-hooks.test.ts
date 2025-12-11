import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

describe('all hooks and steps inside', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'true' },
    });
  });

  let test: AllureTest | undefined;

  beforeEach(() => {
    test = getTest(results.watchResults, 'hello test');
  });

  it('should have 1 test', () => {
    expect(results.watchResults.length).toEqual(1);
  });

  it('test should be defined', () => {
    expect(test).toBeDefined();
  });

  it('test should have correct fullName', () => {
    expect(test?.fullName).toEqual('hello suite hello test');
  });

  it('test should have no direct attachments', () => {
    expect(test?.attachments).toEqual([]);
  });

  it('test should have video attachment in parent afters', () => {
    const parentAfters = test?.parent?.afters?.flatMap(x => x.attachments);
    expect(mapAttachments(parentAfters ?? [])).toEqual([
      {
        name: 'spec.cy.ts.mp4',
        source: 'source.mp4',
        type: 'video/mp4',
      },
    ]);
  });

  it('test should have correct steps', () => {
    expect(test?.steps.map(s => s.name)).toEqual([
      '"before each" hooks',
      'log: message',
      '"after each" hooks',
    ]);
  });

  describe('parent hooks', () => {
    it('should have correct parent structure', () => {
      const parents = getParentsArray(test);
      expect(parents.length).toEqual(1);
      expect(parents[0].name).toEqual('hello suite');
    });

    it('should have before hooks with correct names', () => {
      const parents = getParentsArray(test);

      const befores = parents[0].befores?.filter(
        b => b.name?.indexOf('coverage') === -1,
      );

      expect(befores?.map(b => b.name)).toEqual([
        '"before all" hook',
        '"before all" hook: Named Hook',
      ]);
    });

    it('should have before hooks with correct steps', () => {
      const parents = getParentsArray(test);

      const befores = parents[0].befores?.filter(
        b => b.name?.indexOf('coverage') === -1,
      );

      expect(befores?.map(b => b.steps.map(s => s.name))).toEqual([
        ['log: global setup'],
        ['log: global setup in suite'],
      ]);
    });

    it('should have after hooks with correct names', () => {
      const parents = getParentsArray(test);

      const afters = parents[0].afters?.filter(
        a =>
          a.name?.indexOf('coverage') === -1 &&
          a.name?.indexOf('generateReport') === -1,
      );

      expect(afters?.map(a => a.name)).toEqual([
        '"after all" hook: Named Hook After',
        '"after all" hook',
        'video',
      ]);
    });

    it('should have after hooks with correct steps', () => {
      const parents = getParentsArray(test);

      const afters = parents[0].afters?.filter(
        a =>
          a.name?.indexOf('coverage') === -1 &&
          a.name?.indexOf('generateReport') === -1 &&
          a.name !== 'video',
      );

      expect(afters?.map(a => a.steps.map(s => s.name))).toEqual([
        ['log: global teardown in suite'],
        ['log: global teardown'],
      ]);
    });
  });

  describe('labels', () => {
    it('should have correct path label', () => {
      const pathLabels = test?.labels.filter(l => l.name === 'path');
      expect(pathLabels?.length).toEqual(1);
      expect(pathLabels?.[0].value).toContain('spec.cy.ts');
    });

    it('should have correct package label', () => {
      const packageLabels = test?.labels.filter(l => l.name === 'package');
      expect(packageLabels?.length).toEqual(1);
      expect(packageLabels?.[0].value).toContain('spec.cy.ts');
    });
  });
});
