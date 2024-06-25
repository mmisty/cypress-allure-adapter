import {
  covergeAfterAllEvent,
  createResTest2,
  fixResult,
  fullStepAttachment,
  readWithRetry,
  whenCoverage,
  whenNoCoverage,
} from '../../../cy-helper/utils';
import { parseAllure } from 'allure-js-parser';

describe('several tests skipped by xdescribe', () => {
  const res = createResTest2(
    [
      `
xdescribe('hello suite', () => {
  it('hello test 1', () => {
    cy.log('message');
  });
  
  it('hello test 2', () => {
    cy.log('message');
  });
  
  it('hello test 3', () => {
    cy.log('message');
  });
  
  it('hello test 4', () => {
    cy.log('message');
  });
});
`,
    ],
    { allureAddVideoOnPass: 'true' },
  );

  it('should have correct events for one skipped test', async () => {
    const testt = readWithRetry(res.specs[0]);
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
        'cypress: test:before:run: hello test 1',
        'mocha: hook end: "before all" hook',
      ),
      'mocha: suite: hello suite, hello suite',
      'mocha: pending: hello test 1',

      ...whenNoCoverage('cypress: test:before:run: hello test 1'),
      'mocha: test: hello test 1',
      'plugin test:started',
      'cypress: test:after:run: hello test 1',
      'plugin test:ended',

      'mocha: test end: hello test 1',

      'mocha: pending: hello test 2',
      'cypress: test:before:run: hello test 2',
      'mocha: test: hello test 2',
      'plugin test:started',
      'cypress: test:after:run: hello test 2',
      'plugin test:ended',

      'mocha: test end: hello test 2',

      'mocha: pending: hello test 3',
      'cypress: test:before:run: hello test 3',
      'mocha: test: hello test 3',
      'plugin test:started',
      'cypress: test:after:run: hello test 3',
      'plugin test:ended',

      'mocha: test end: hello test 3',

      'mocha: pending: hello test 4',
      'cypress: test:before:run: hello test 4',
      'mocha: test: hello test 4',
      'plugin test:started',
      'mocha: test end: hello test 4',

      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello test 4',
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
      expect(resFixed.length).toEqual(4);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite hello test 1',
        'hello suite hello test 2',
        'hello suite hello test 3',
        'hello suite hello test 4',
      ]);
    });

    it('check attachments', async () => {
      expect(
        fullStepAttachment(resFixed, t => ({ name: t.name, status: t.status })),
      ).toEqual([
        {
          attachments: [],
          name: 'hello test 1',
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
        {
          attachments: [],
          name: 'hello test 2',
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
        {
          attachments: [],
          name: 'hello test 3',
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
        {
          attachments: [],
          name: 'hello test 4',
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
        [{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }],
        [{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }],
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
        [
          {
            name: 'package',
            value: 'integration.e2e.temp.test_0_number.cy.ts',
          },
        ],
        [
          {
            name: 'package',
            value: 'integration.e2e.temp.test_0_number.cy.ts',
          },
        ],
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
