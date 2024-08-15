import {
  coverageAfterEachEvent,
  coverageBeforeEachEvent,
  covergeAfterAll,
  covergeAfterAllEvent,
  covergeBeforeAll,
  createResTest2,
  fixResult,
  readWithRetry,
  whenCoverage,
} from '@test-utils';
import { getParentsArray, parseAllure } from 'allure-js-parser';

describe('should have all hooks and steps inside', () => {
  const res = createResTest2(
    [
      `
before(() => {
  cy.log('global setup');
});

after(() => {
  cy.log('global teardown');
});

describe('hello suite', () => {
  before('Named Hook', () => {
      cy.log('global setup in suite');
  });
  
  beforeEach(() => {
      cy.log('setup before each');
  });
  
  it('hello test', () => {
    cy.log('message');
  });
  
  afterEach(() => {
      cy.log('teardown after each');
  });
  
  after('Named Hook After', () => {
      cy.log('global teardown in suite');
  });
});
`,
    ],
    { allureAddVideoOnPass: 'true' },
  );

  it('should have correct events for one test', async () => {
    const testt = readWithRetry(res.specs[0]);
    expect(
      testt
        .toString()
        .split('\n')
        .filter(t => t !== ''),
    ).toEqual([
      'mocha: start',
      'mocha: suite: , ',
      ...whenCoverage('mocha: hook: "before all" hook'),
      'cypress: test:before:run: hello test',
      ...whenCoverage('mocha: hook end: "before all" hook'),
      'mocha: hook: "before all" hook',
      'mocha: hook end: "before all" hook',
      'mocha: suite: hello suite, hello suite',
      'mocha: hook: "before all" hook: Named Hook',
      'mocha: hook end: "before all" hook: Named Hook',
      'mocha: test: hello test',
      'plugin test:started',
      'mocha: hook: "before each" hook: [cypress-allure-adapter]',
      'mocha: hook end: "before each" hook: [cypress-allure-adapter]',
      ...whenCoverage(...coverageBeforeEachEvent),
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: pass: hello test',
      'mocha: test end: hello test',
      ...whenCoverage(...coverageAfterEachEvent),
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'mocha: hook: "after all" hook: Named Hook After',
      'mocha: hook end: "after all" hook: Named Hook After',
      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'mocha: hook: "after all" hook',
      'mocha: hook end: "after all" hook',
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
      expect(resFixed.flatMap(t => t.attachments).sort()).toEqual([]);
      expect(
        resFixed.map(t => t.parent?.afters?.flatMap(x => x.attachments)).sort(),
      ).toEqual([
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

    it('check tests parents', async () => {
      expect(resFixed.map(t => getParentsArray(t))).toEqual([
        [
          {
            afters: [
              {
                attachments: [],
                name: '"after all" hook: Named Hook After',
                parameters: [],
                stage: 'finished',
                start: 1323475200000,
                status: 'passed',
                steps: [
                  {
                    attachments: [],
                    name: 'log: global teardown in suite',
                    parameters: [],
                    stage: 'finished',
                    start: 1323475200000,
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                    stop: 1323475200011,
                  },
                ],
                stop: 1323475200010,
              },
              ...whenCoverage(...covergeAfterAll),
              {
                attachments: [],
                name: '"after all" hook',
                parameters: [],
                stage: 'finished',
                start: 1323475200000,
                status: 'passed',
                steps: [
                  {
                    attachments: [],
                    name: 'log: global teardown',
                    parameters: [],
                    stage: 'finished',
                    start: 1323475200000,
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                    stop: 1323475200011,
                  },
                ],
                stop: 1323475200010,
              },
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
            befores: [
              ...whenCoverage(...covergeBeforeAll),
              {
                attachments: [],
                name: '"before all" hook',
                parameters: [],
                stage: 'finished',
                start: 1323475200000,
                status: 'passed',
                steps: [
                  {
                    attachments: [],
                    name: 'log: global setup',
                    parameters: [],
                    stage: 'finished',
                    start: 1323475200000,
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                    stop: 1323475200011,
                  },
                ],
                stop: 1323475200010,
              },
              {
                attachments: [],
                name: '"before all" hook: Named Hook',
                parameters: [],
                stage: 'finished',
                start: 1323475200000,
                status: 'passed',
                steps: [
                  {
                    attachments: [],
                    name: 'log: global setup in suite',
                    parameters: [],
                    stage: 'finished',
                    start: 1323475200000,
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                    stop: 1323475200011,
                  },
                ],
                stop: 1323475200010,
              },
            ],
            name: 'hello suite',
            uuid: 'no',
          },
        ],
      ]);
    });

    it('check tests parent steps', async () => {
      expect(resFixed.map(t => t.steps.map(s => s.name))).toEqual([
        ['"before each" hooks (3)', 'log: message', '"after each" hooks (2)'],
      ]);
    });
  });
});
