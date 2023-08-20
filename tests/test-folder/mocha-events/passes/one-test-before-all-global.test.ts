import {
  covergeAfterAll,
  covergeAfterAllEvent,
  covergeBeforeAll,
  createResTest2,
  fixResult,
  whenCoverage,
} from '../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { getParentsArray, parseAllure } from 'allure-js-parser';

describe('one passed test with global before hook', () => {
  const res = createResTest2([
    `
    before(() => {
      cy.log('before global');
    });
    
    describe('hello suite', () => {
      it('hello test', () => {
        cy.log('message');
      });
    });
`,
  ]);

  it('should have correct events for one test with before all global', async () => {
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
      ...whenCoverage('mocha: hook: "before all" hook'),
      ...whenCoverage('mocha: hook end: "before all" hook'),
      'mocha: suite: hello suite, hello suite',
      'mocha: test: hello test',
      'plugin test:started',
      ...whenCoverage('mocha: hook: "before each" hook'),
      ...whenCoverage('mocha: hook end: "before each" hook'),
      'mocha: pass: hello test',
      'mocha: test end: hello test',
      ...whenCoverage('mocha: hook: "after each" hook'),
      ...whenCoverage('mocha: hook end: "after each" hook'),
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

    it('check tests parents', async () => {
      expect(resFixed.map(t => getParentsArray(t))).toEqual([
        [
          {
            afters: [...whenCoverage(...covergeAfterAll)],
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
                    name: 'log: before global',
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
        [
          ...whenCoverage('"before each" hook'),
          'log: message',
          ...whenCoverage('"after each" hook'),
        ],
      ]);
    });
  });
});
