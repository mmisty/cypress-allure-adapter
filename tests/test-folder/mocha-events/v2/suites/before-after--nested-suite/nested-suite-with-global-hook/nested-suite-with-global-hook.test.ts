import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../../cy-helper/utils-v2';
import { existsSync } from 'fs';
import { AllureTest, getParentsArray } from 'allure-js-parser';

describe('nested suites with failed hook', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'true' },
      // onlyGetResults: true,
    });
  });
  let test1: AllureTest | undefined;
  let test2: AllureTest | undefined;

  beforeEach(() => {
    test1 = getTest(results.watchResults, '01');
    expect(test1).toBeDefined();
    test2 = getTest(results.watchResults, '02');
    expect(test2).toBeDefined();
  });

  it('result should have proper suite structure', async () => {
    const parents = getParentsArray(test1);

    expect(
      parents.map(x => ({ name: x.name, parent: x.parent?.name })),
    ).toEqual([
      {
        name: 'child suite',
        parent: 'nested-suite-with-global-hook',
      },
      {
        name: 'nested-suite-with-global-hook',
      },
    ]);
  });

  it('result should have proper suite structure for second test', async () => {
    const parents = getParentsArray(test2);

    expect(
      parents.map(x => ({ name: x.name, parent: x.parent?.name })),
    ).toEqual([
      {
        name: 'nested-suite-with-global-hook',
      },
    ]);
  });

  describe('statuses', () => {
    it('first test in suite should have passed state', async () => {
      expect(test1?.status).toEqual('passed');
      expect(test1?.statusDetails.message).not.toBeDefined();
    });

    it('second test in suite should have passed state', async () => {
      expect(test2?.status).toEqual('passed');
      expect(test2?.statusDetails.message).not.toBeDefined();
    });
  });

  describe('labels', () => {
    it('child test should have proper labels', async () => {
      expect(
        test1?.labels.filter(x => !['package', 'path'].includes(x.name)),
      ).toEqual([
        { name: 'parentSuite', value: 'nested-suite-with-global-hook' },
        { name: 'suite', value: 'child suite' },
      ]);
    });

    it('another child test should have proper labels', async () => {
      expect(
        test2?.labels.filter(x => !['package', 'path'].includes(x.name)),
      ).toEqual([
        { name: 'parentSuite', value: 'nested-suite-with-global-hook' },
      ]);
    });
  });

  it('test should have no attachments for test', async () => {
    expect(test1?.attachments).toEqual([]);
    expect(test2?.attachments).toEqual([]);
  });

  describe('hooks', () => {
    it('should have global before hook for parent test', async () => {
      const suite = test2?.parent;
      expect(suite?.befores?.length).toEqual(1);
      expect(suite?.befores?.[0]?.name).toEqual(
        '"before all" hook: global before one',
      );
    });

    it('should have steps in global before hook for parent test', async () => {
      const suite = test2?.parent;
      expect(suite?.befores?.length).toEqual(1);
      expect(suite?.befores?.[0]?.steps.map(x => x.name)).toEqual([
        'log: hook pass',
      ]);
    });

    it('should have global after hook for parent test', async () => {
      const suite = test2?.parent;
      expect(suite?.afters?.length).toEqual(2);
      expect(suite?.afters?.[0]?.name).toEqual(
        '"after all" hook: global after one',
      );
      expect(suite?.afters?.[1]?.name).toEqual('video');
    });

    it('should have steps in global after hook for parent test', async () => {
      const suite = test2?.parent;
      expect(suite?.afters?.[0]?.steps.map(x => x.name)).toEqual([
        'log: hook pass',
      ]);
    });

    it('should have global before hook for child test', async () => {
      const suite = test1?.parent;
      expect(suite?.befores?.length).toEqual(1);
      expect(suite?.befores?.[0]?.name).toEqual(
        '"before all" hook: global before one',
      );
    });

    // issue 152 - Global hook doesn't have steps for tests in nested suites
    it('should have steps in global before hook for child test', async () => {
      const suite = test1?.parent;
      expect(suite?.befores?.length).toEqual(1);
      // actual
      expect(suite?.befores?.[0]?.steps.map(x => x.name)).toEqual([]);
      // expected
      // expect(suite?.befores?.[0]?.steps.map(x => x.name)).toEqual([
      //   'log: hook pass',
      // ]);
    });

    // issue 119 - this fails - global after hooks are not attached to nested tests
    it('should have global after hook for child test', async () => {
      const suite = test1?.parent;
      expect(suite?.afters?.length).toEqual(1);
      expect(suite?.afters?.[0]?.name).toEqual('video');
      // expected
      // expect(suite?.afters?.length).toEqual(2);
      // expect(suite?.afters?.[0]?.name).toEqual(
      //   '"after all" hook: global after one',
      // );
    });
  });

  describe('videos', () => {
    it('should have video for child tests in suite in after hook', async () => {
      const suite2 = test1?.parent;

      expect(suite2?.name).toEqual('child suite');

      const excludeCovBefores = suite2?.befores
        ?.filter(
          x =>
            x.name?.toLowerCase()?.indexOf('coverage') === -1 &&
            !x.steps.some(
              s => s.name?.toLowerCase()?.indexOf('coverage') !== -1,
            ),
        )
        .map(x => ({
          name: x.name,
          attachments: mapAttachments(x.attachments),
        }));

      const excludeCovAfters = suite2?.afters?.filter(
        x =>
          x.name?.toLowerCase()?.indexOf('coverage') === -1 &&
          !x.steps.some(s => s.name?.toLowerCase()?.indexOf('coverage') !== -1),
      );

      expect(
        excludeCovBefores?.map(x => ({
          name: x.name,
          attachments: mapAttachments(x.attachments),
        })),
      ).toEqual([
        {
          attachments: [],
          name: '"before all" hook: global before one',
        },
      ]);
      expect(excludeCovAfters?.[0].attachments[0].name).toEqual(
        'spec.cy.ts.mp4',
      );
      expect(excludeCovAfters?.[0].attachments[0].type).toEqual('video/mp4');
      expect(excludeCovAfters?.[0].name).toEqual('video');
      const videoSource = `${results.watchDir}/${excludeCovAfters?.[0].attachments[0].source}`;

      expect(existsSync(videoSource)).toEqual(true);
    });
  });
});
