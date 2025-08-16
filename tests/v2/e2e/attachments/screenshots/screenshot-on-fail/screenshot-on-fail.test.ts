import { expect } from 'expect';
import {
  getTest,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
  stepsAndAttachments,
} from '@src/../tests/v2/utils/cypress-result-utils';

describe('automatic screenshots', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {});
  });

  it('should have screenshot attached to test when test failed', async () => {
    const test = getTest(results.watchResults, '0020');

    expect(test).toBeDefined();
    const res = stepsAndAttachments(test);
    expect(res.attachments).toEqual([
      {
        name: 'automatic screenshots when fail -- 0020 screenshot test (failed).png',
        type: 'image/png',
      },
    ]);
  });

  it('should have screenshot attached to hook when hook failed', async () => {
    const test = getTest(results.watchResults, '0030');

    expect(test).toBeDefined();
    const res = stepsAndAttachments(test);
    expect(res.attachments).toEqual([]);

    const suite = test?.parent;
    expect(suite?.name).toEqual('automatic screenshots when hooks fail');

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
    expect(excludeCovBefores?.[0].attachments[0].name).toEqual(
      'automatic screenshots when hooks fail -- 0030 should have failure -- before all hook (failed).png',
    );
    expect(excludeCovBefores?.[0].attachments[0].type).toEqual('image/png');
    expect(excludeCovBefores?.[0].name).toEqual('"before all" hook');

    // todo move to video tests for hooks
    expect(excludeCovAfters?.[0].attachments[0].name).toEqual('test.cy.ts.mp4');
    expect(excludeCovAfters?.[0].attachments[0].type).toEqual('video/mp4');
    expect(excludeCovAfters?.[0].name).toEqual('video');
  });
});
