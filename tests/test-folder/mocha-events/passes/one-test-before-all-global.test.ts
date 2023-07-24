import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { getParentsArray, parseAllure } from 'allure-js-parser';

describe('mocha events', () => {
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
      'mocha: suite: hello suite, hello suite',
      'mocha: test: hello test',
      'plugin test:started',
      'mocha: pass: hello test',
      'mocha: test end: hello test',
      'mocha: suite end: hello suite',
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
            afters: [],
            befores: [
              {
                attachments: [],
                name: '"before all" hook',
                parameters: [],
                stage: 'finished',
                start: 1323460800000,
                status: 'passed',
                statusDetails: undefined,
                steps: [
                  {
                    attachments: [],
                    name: 'log: before global',
                    parameters: [],
                    stage: 'finished',
                    start: 1323460800000,
                    status: 'passed',
                    statusDetails: {},
                    steps: [],
                    stop: 1323460800011,
                  },
                ],
                stop: 1323460800010,
              },
            ],
            name: 'hello suite',
            uuid: 'no',
          },
        ],
      ]);
    });

    it('check tests parent steps', async () => {
      expect(resFixed.map(t => t.steps.map(s => s.name))).toEqual([['log: message']]);
    });
  });
});