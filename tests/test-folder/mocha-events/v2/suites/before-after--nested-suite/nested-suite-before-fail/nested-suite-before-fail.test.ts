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
  let test0: AllureTest | undefined;
  let test1: AllureTest | undefined;
  let test2: AllureTest | undefined;

  beforeEach(() => {
    test0 = getTest(results.watchResults, '000');
    expect(test0).toBeDefined();
    test1 = getTest(results.watchResults, '010');
    expect(test1).toBeDefined();
    test2 = getTest(results.watchResults, '020');
    expect(test2).toBeDefined();
  });

  it('result should have proper suite structure', async () => {
    const parents = getParentsArray(test1);

    const expectParents = [
      {
        name: 'hooks test - sub child',
        parent: 'hooks test - child',
      },
      {
        name: 'hooks test - child',
        parent: 'nested-suite-before-fail',
      },
      {
        name: 'nested-suite-before-fail',
      },
    ];

    expect(
      parents.map(x => ({ name: x.name, parent: x.parent?.name })),
    ).toEqual(expectParents);
  });

  describe('statuses', () => {
    it('result should have proper test statuses', async () => {
      expect(test0?.status).toEqual('passed');
      expect(test0?.statusDetails.message).not.toBeDefined();
    });

    it('first test in failed suite should have failed state', async () => {
      expect(test1?.status).toEqual('failed');
      expect(test1?.statusDetails.message).toEqual(
        'Failure in hook\n' +
          '\n' +
          'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `hooks test - sub child` (added by [cypress-allure-adapter])',
      );
    });

    it('second test in failed suite should have unknown state', async () => {
      expect(test2?.status).toEqual('unknown');
      expect(test2?.statusDetails.message).toEqual(
        'Failure in hook\n' +
          '\n' +
          'Because this error occurred during a `before all` hook we are skipping the remaining tests in the current suite: `hooks test - sub child` (added by [cypress-allure-adapter])',
      );
    });
  });

  describe('labels', () => {
    it('first test should have proper label - only parentSuite', async () => {
      expect(
        test0?.labels.filter(x => !['package', 'path'].includes(x.name)),
      ).toEqual([
        {
          name: 'parentSuite',
          value: 'nested-suite-before-fail',
        },
      ]);
    });

    it('child test should have proper labels - only parentSuite', async () => {
      expect(
        test1?.labels.filter(x => !['package', 'path'].includes(x.name)),
      ).toEqual([
        { name: 'parentSuite', value: 'nested-suite-before-fail' },
        { name: 'suite', value: 'hooks test - child' },
        { name: 'subSuite', value: 'hooks test - sub child' },
      ]);
    });

    it('another child test should have proper labels - only parentSuite', async () => {
      expect(
        test2?.labels.filter(x => !['package', 'path'].includes(x.name)),
      ).toEqual([
        { name: 'parentSuite', value: 'nested-suite-before-fail' },
        { name: 'suite', value: 'hooks test - child' },
        { name: 'subSuite', value: 'hooks test - sub child' },
      ]);
    });
  });

  it('test should have no attachments for test', async () => {
    expect(test0?.attachments).toEqual([]);
    expect(test1?.attachments).toEqual([]);
    expect(test2?.attachments).toEqual([]);
  });

  describe('screenshots', () => {
    it('should have screenshot for failed hook in first test', async () => {
      const suite2 = test1?.parent;
      expect(suite2?.befores?.length).toEqual(1);
      expect(mapAttachments(suite2?.befores?.[0]?.attachments ?? [])).toEqual([
        {
          name: 'nested-suite-before-fail -- hooks test - child -- hooks test - sub child -- test 010 -- before all hook in sub suite (failed).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('should have screenshot for failed hook in second test', async () => {
      const suite = test2?.parent;
      expect(suite?.befores?.length).toEqual(1);
      expect(mapAttachments(suite?.befores?.[0]?.attachments ?? [])).toEqual([
        {
          name: 'nested-suite-before-fail -- hooks test - child -- hooks test - sub child -- test 010 -- before all hook in sub suite (failed).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });
  });

  describe('videos', () => {
    it('should have video for parent test in suite in after hook', async () => {
      const suite = test0?.parent;
      const suite2 = test1?.parent;
      const suite3 = test2?.parent;
      expect(suite2?.uuid).toEqual(suite3?.uuid);

      expect(suite?.name).toEqual('nested-suite-before-fail');

      const excludeCovBefores = suite?.befores?.filter(
        x =>
          x.name?.toLowerCase()?.indexOf('coverage') === -1 &&
          !x.steps.some(s => s.name?.toLowerCase()?.indexOf('coverage') !== -1),
      );

      const excludeCovAfters = suite?.afters?.filter(
        x =>
          x.name?.toLowerCase()?.indexOf('coverage') === -1 &&
          !x.steps.some(s => s.name?.toLowerCase()?.indexOf('coverage') !== -1),
      );
      expect(excludeCovBefores).toEqual([]);
      expect(excludeCovAfters?.[0].attachments[0].name).toEqual(
        'spec.cy.ts.mp4',
      );
      expect(excludeCovAfters?.[0].attachments[0].type).toEqual('video/mp4');
      expect(excludeCovAfters?.[0].name).toEqual('video');
      const videoSource = `${results.watchDir}/${excludeCovAfters?.[0].attachments[0].source}`;

      expect(existsSync(videoSource)).toEqual(true);
    });

    it('should have video for child tests in suite in after hook', async () => {
      const suite2 = test1?.parent;
      const suite3 = test2?.parent;
      expect(suite2?.uuid).toEqual(suite3?.uuid);

      expect(suite2?.name).toEqual('hooks test - sub child');

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
          name: '"before all" hook: in sub suite',
          attachments: [
            {
              name: 'nested-suite-before-fail -- hooks test - child -- hooks test - sub child -- test 010 -- before all hook in sub suite (failed).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
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
