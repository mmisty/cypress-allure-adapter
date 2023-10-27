import {
  covergeAfterAllEvent,
  createResTest2,
  fixResult,
  fullStepAttachment,
  whenCoverage,
  whenNoCoverage,
} from '../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { parseAllure } from 'allure-js-parser';

describe('skipped test by .skip', () => {
  const res = createResTest2(
    [
      `
describe('hello suite', () => {
  it.skip('hello test', () => {
    cy.log('message');
  });
});
`,
    ],
    { allureAddVideoOnPass: 'true' },
  );

  it('should have correct events for one skipped test', async () => {
    const testt = readFileSync(res.specs[0]);
    expect(
      testt
        .toString()
        .split('\n')
        .filter(t => t !== ''),
    ).toEqual([
      'mocha: start',
      'mocha: suite: , ',
      ...whenCoverage(
        'mocha: hook: "before all" hook',
        'cypress: test:before:run: hello test',
        'mocha: hook end: "before all" hook',
      ),
      'mocha: suite: hello suite, hello suite',
      'mocha: pending: hello test',
      ...whenNoCoverage('cypress: test:before:run: hello test'),

      'mocha: test: hello test',
      'plugin test:started',
      'mocha: test end: hello test',
      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello test',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });

  describe('check results', () => {
    let resFixed;

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(1);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite hello test',
      ]);
    });

    it('check attachments', async () => {
      expect(fullStepAttachment(resFixed, () => ({}))).toEqual([
        {
          attachments: [],
          name: 'hello test',
          parents: [
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_0_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
              ],
              suiteName: 'hello suite',
            },
          ],
          status: 'skipped',
          steps: [],
        },
      ]);
    });

    it('check path label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'path')),
      ).toEqual([
        [{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }],
      ]);
    });

    it('check package label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'package')),
      ).toEqual([
        [
          {
            name: 'package',
            value: 'integration.e2e.temp.test_0_number.cy.ts',
          },
        ],
      ]);
    });
  });
});
