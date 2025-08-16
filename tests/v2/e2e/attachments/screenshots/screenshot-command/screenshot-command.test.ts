import { expect } from 'expect';
import {
  getTest,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
  stepsAndAttachments,
} from '@src/../tests/v2/utils/cypress-result-utils';

describe('screenshot command', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {});
  });

  it('should have screenshot attached to test when command used with name', async () => {
    const test = getTest(results.watchResults, '0010');

    expect(test).toBeDefined();
    const res = stepsAndAttachments(test);
    expect(res.attachments).toEqual([
      { name: 'my-test.png', type: 'image/png' },
    ]);
  });

  it('should have screenshot attached to test when command used without name', async () => {
    const test = getTest(results.watchResults, '0020');
    const res = stepsAndAttachments(test);
    expect(test).toBeDefined();
    expect(res?.attachments).toEqual([
      {
        name: 'screenshot command -- 0020 screenshot test no name (no option).png',
        type: 'image/png',
      },
    ]);
  });

  it('should attach screenshot to step when allureAttachToStep true', async () => {
    const test = getTest(results.watchResults, '0030');

    const steps = stepsAndAttachments(test);

    expect(steps).toEqual({
      attachments: [],
      steps: [
        {
          attachments: [],
          name: 'do operation',
          steps: [
            {
              attachments: [
                {
                  name: 'my-test (1).png',
                  type: 'image/png',
                },
              ],
              name: 'screenshot: my-test, {allureAttachToStep: true}',
              steps: [
                {
                  attachments: [],
                  name: 'screenshot: my-test',
                  steps: [],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('should attach screenshot to test when allureAttachToStep false', async () => {
    const test = getTest(results.watchResults, '0040');

    const res = stepsAndAttachments(test);

    expect(res).toEqual({
      attachments: [
        {
          name: 'my-test (2).png',
          type: 'image/png',
        },
      ],
      steps: [
        {
          attachments: [],
          name: 'do operation',
          steps: [
            {
              attachments: [],
              name: 'screenshot: my-test, {allureAttachToStep: false}',
              steps: [
                {
                  attachments: [],
                  name: 'screenshot: my-test',
                  steps: [],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
