import {
  covergeAfterAllEvent,
  createResTest2,
  fixResult,
  whenCoverage,
  whenNoCoverage,
} from '../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { parseAllure } from 'allure-js-parser';

describe('several nested suiteds', () => {
  const res = createResTest2([
    `
describe('hello suite', () => {
  describe('child suite', () => {
    it('hello test', () => {
      cy.log('message');
    });
  });
  
  it('other test', () => {
    cy.log('message2');
  });
});
`,
  ]);

  it('should have correct events for suites', async () => {
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
        'cypress: test:before:run: other test',
        'mocha: hook end: "before all" hook',
      ),
      'mocha: suite: hello suite, hello suite',
      'mocha: test: other test',
      'plugin test:started',
      ...whenCoverage('mocha: hook: "before each" hook'),
      ...whenCoverage('mocha: hook end: "before each" hook'),
      'mocha: pass: other test',
      'mocha: test end: other test',
      ...whenCoverage('mocha: hook: "after each" hook'),
      ...whenCoverage('mocha: hook end: "after each" hook'),
      'cypress: test:after:run: other test',
      'plugin test:ended',
      'mocha: suite: child suite, hello suite child suite',
      'mocha: test: hello test',
      'plugin test:started',
      ...whenCoverage(
        'mocha: hook: "before each" hook',
        'cypress: test:before:run: hello test',
        'mocha: hook end: "before each" hook',
      ),
      'mocha: pass: hello test',
      'mocha: test end: hello test',
      ...whenCoverage('mocha: hook: "after each" hook'),
      ...whenCoverage('mocha: hook end: "after each" hook'),
      'mocha: suite end: child suite',
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
      expect(resFixed.length).toEqual(2);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite child suite hello test',
        'hello suite other test',
      ]);
    });

    it('check suite labels', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'suite' || x.name === 'parentSuite' || x.name === 'childSuite')),
      ).toEqual([
        [
          {
            name: 'parentSuite',
            value: 'hello suite',
          },
        ],
        [
          {
            name: 'parentSuite',
            value: 'hello suite',
          },
          {
            name: 'suite',
            value: 'child suite',
          },
        ],
      ]);
    });
  });
});
