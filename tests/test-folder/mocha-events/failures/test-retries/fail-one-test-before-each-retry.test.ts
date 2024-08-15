import {
  coverageAfterEachEvent,
  covergeAfterAll,
  covergeAfterAllEvent,
  covergeBeforeAll,
  createResTest2,
  fixResult,
  readWithRetry,
  sortAttachments,
  whenCoverage,
} from '@test-utils';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';

describe('mocha events - check failures @oneInconsistency', () => {
  const res = createResTest2([
    `
describe('hello suite', { retries: 1 }, () => {
  beforeEach(() => {
     cy.wrap(null).then(() => {
        throw new Error('Test FAIL on purpose');
    });
  });
  
  it('hello test', () => {
    cy.log('123');
  });
});
`,
  ]);

  it('should have correct events for one test failed with retry', async () => {
    const testt = readWithRetry(res.specs[0]);
    expect(
      testt
        .toString()
        .split('\n')
        .filter(t => t !== ''),
    ).toEqual([
      'mocha: start',
      'mocha: suite: , ',

      'mocha: hook: "before all" hook',
      'cypress: test:before:run: hello test',
      'mocha: hook end: "before all" hook',

      'mocha: suite: hello suite, hello suite',

      'mocha: test: hello test',
      'plugin test:started',
      'mocha: hook: "before each" hook: [cypress-allure-adapter]',
      'mocha: hook end: "before each" hook: [cypress-allure-adapter]',

      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',

      'cypress:screenshot:test:hello suite -- hello test (failed).png',
      'mocha: retry: hello test',
      ...whenCoverage(...coverageAfterEachEvent),

      'cypress: test:after:run: hello test',
      'plugin test:ended',

      'mocha: test: hello test',
      'plugin test:started',
      'mocha: hook: "before each" hook: [cypress-allure-adapter]',
      'cypress: test:before:run: hello test',
      'mocha: hook end: "before each" hook: [cypress-allure-adapter]',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook',
      'cypress:screenshot:test:hello suite -- hello test -- before each hook (failed) (attempt 2).png',
      'mocha: fail: "before each" hook for "hello test"',

      ...whenCoverage(...coverageAfterEachEvent),
      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello test',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });

  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(2);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite hello test',
        'hello suite hello test',
      ]);
    });

    it('check tests parents', async () => {
      expect(resFixed.map(t => getParentsArray(t))).toEqual([
        [
          {
            afters: [
              ...whenCoverage(...covergeAfterAll),
              {
                attachments: [
                  {
                    name: 'test_0_number.cy.ts.mp4',
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
                name: 'video',
                parameters: [],
                stage: 'finished',
                start: 1323475200000,
                status: 'passed',
                steps: [],
                stop: 1323475200010,
              },
            ],
            befores: [...whenCoverage(...covergeBeforeAll)],
            name: 'hello suite',
            uuid: 'no',
          },
        ],
        [
          {
            afters: [
              ...whenCoverage(...covergeAfterAll),
              {
                attachments: [
                  {
                    name: 'test_0_number.cy.ts.mp4',
                    source: 'source.mp4',
                    type: 'video/mp4',
                  },
                ],
                name: 'video',
                parameters: [],
                stage: 'finished',
                start: 1323475200000,
                status: 'passed',
                steps: [],
                stop: 1323475200010,
              },
            ],
            befores: [...whenCoverage(...covergeBeforeAll)],
            name: 'hello suite',
            uuid: 'no',
          },
        ],
      ]);
    });

    it('check tests parent steps', async () => {
      expect(resFixed.map(t => t.steps.map(s => s.name))).toEqual([
        ['"before each" hooks'],
        ['"before each" hooks', ...whenCoverage('"after each" hook')],
      ]);
    });

    it('check attachments', async () => {
      // fail
      expect(sortAttachments(resFixed)).toEqual([
        [
          {
            name: 'hello suite -- hello test -- before each hook (failed) (attempt 2).png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
        [
          {
            name: 'hello suite -- hello test (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
      ]);

      expect(
        resFixed.map(t => t.parent?.afters?.flatMap(t => t.attachments)).sort(),
      ).toEqual([
        [
          {
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        [
          {
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
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
      ]);
    });
  });
});
