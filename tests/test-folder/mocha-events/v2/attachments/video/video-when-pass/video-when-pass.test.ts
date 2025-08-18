import { expect } from 'expect';
import {
  getTest,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../../cy-helper/utils-v2';
import { existsSync } from 'fs';

describe('video when test passes', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'true' },
    });
  });

  it('should have video for all tests in suite in after hook', async () => {
    const test1 = getTest(results.watchResults, '0010');
    const test2 = getTest(results.watchResults, '0020');

    expect(test1).toBeDefined();
    expect(test2).toBeDefined();
    const suite = test1?.parent;
    const suite2 = test2?.parent;
    expect(suite2?.uuid).toEqual(suite?.uuid);

    expect(suite?.name).toEqual('video suite');

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
    expect(excludeCovAfters?.[0].attachments[0].name).toEqual('test.cy.ts.mp4');
    expect(excludeCovAfters?.[0].attachments[0].type).toEqual('video/mp4');
    expect(excludeCovAfters?.[0].name).toEqual('video');
    const videoSource = `${results.watchDir}/${excludeCovAfters?.[0].attachments[0].source}`;

    expect(existsSync(videoSource)).toEqual(true);
  });

  it('should have video for all tests in second suite', async () => {
    const test1 = getTest(results.watchResults, '0060');
    const test2 = getTest(results.watchResults, '0080');

    expect(test1).toBeDefined();
    expect(test2).toBeDefined();
    const suite = test1?.parent;
    const suite2 = test2?.parent;
    expect(suite2?.uuid).toEqual(suite?.uuid);

    expect(suite?.name).toEqual('video suite 2');

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
      'test2.cy.ts.mp4',
    );
    expect(excludeCovAfters?.[0].attachments[0].type).toEqual('video/mp4');
    expect(excludeCovAfters?.[0].name).toEqual('video');
    const videoSource = `${results.watchDir}/${excludeCovAfters?.[0].attachments[0].source}`;

    expect(existsSync(videoSource)).toEqual(true);
  });
});
