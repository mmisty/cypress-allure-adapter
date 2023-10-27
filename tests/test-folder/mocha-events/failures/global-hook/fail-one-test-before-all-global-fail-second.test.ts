import {
  covergeAfterAll,
  covergeAfterAllEvent,
  covergeBeforeAll,
  createResTest2,
  fixResult,
  whenCoverage,
} from '../../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { getParentsArray, parseAllure } from 'allure-js-parser';

describe('mocha events - check failures', () => {
  const res = createResTest2([
    `
before(() => {
  cy.log('Success hook');
});

before(() => {
  cy.log('Step before fail');
  cy.wrap(null).then(() => {
    throw new Error('Test FAIL on purpose');
  });
});

describe('hello suite', () => {
  beforeEach(() => {
      cy.log('before');
  });
  
  it('hello test', () => {
    cy.log('123');
  });
  
  afterEach(() => {
    cy.log('after');
  });
});
`,
  ]);

  it('should have correct events for one test failed with global hook failure', async () => {
    const testt = readFileSync(res.specs[0]);
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
      'mocha: hook: "before all" hook',
      ...whenCoverage('mocha: hook end: "before all" hook'),
      ...whenCoverage('mocha: hook: "before all" hook'),
      'mocha: fail: "before all" hook for "hello test"',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello test',
      'plugin test:ended',
      'mocha: suite: hello suite, hello suite',
      'plugin test:started',
      'plugin test:ended',
      'mocha: suite end: hello suite',
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
            befores: [
              ...whenCoverage(...covergeBeforeAll),
              {
                attachments: [],
                name: '"before all" hook',
                parameters: [],
                stage: 'finished',
                start: 1323475200000,
                status: 'passed',
                statusDetails: undefined,
                steps: [
                  {
                    attachments: [],
                    name: 'log: Success hook',
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
                name: '"before all" hook',
                parameters: [],
                stage: 'finished',
                start: 1323475200000,
                status: 'failed',
                statusDetails: {
                  message: 'Test FAIL on purpose',
                  trace: 'trace',
                },
                steps: [
                  {
                    attachments: [],
                    name: 'log: Step before fail',
                    parameters: [],
                    stage: 'finished',
                    start: 1323475200000,
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                    stop: 1323475200011,
                  },
                  {
                    attachments: [],
                    name: 'wrap',
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
      expect(resFixed.map(t => t.steps.map(s => s.name))).toEqual([[]]);
    });
  });
});
