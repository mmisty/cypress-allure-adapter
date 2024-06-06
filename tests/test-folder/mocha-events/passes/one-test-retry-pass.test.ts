import {
  covergeAfterAllEvent,
  createResTest2,
  whenCoverage,
  whenNoCoverage,
} from '../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('one passed retried test', () => {
  const res = createResTest2([
    `
describe('hello suite', { retries: 2 }, () => {
  it('hello retry test', () => {
    if (Cypress.currentRetry < 1) {
      cy.wrap(null).then(() => {
        throw new Error('Test FAIL on purpose');
      });
    }
  });
});
`,
  ]);

  it('should have correct events for one test with retry passed', async () => {
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
        'cypress: test:before:run: hello retry test',
        'mocha: hook end: "before all" hook',
      ),
      'mocha: suite: hello suite, hello suite',

      'mocha: test: hello retry test',
      'plugin test:started',
      ...whenNoCoverage('cypress: test:before:run: hello retry test'),
      ...whenCoverage('mocha: hook: "before each" hook'),
      ...whenCoverage('mocha: hook end: "before each" hook'),
      'cypress:screenshot:test:hello suite -- hello retry test (failed).png',
      'mocha: retry: hello retry test',
      ...whenCoverage('mocha: hook: "after each" hook'),
      ...whenCoverage('mocha: hook end: "after each" hook'),
      'cypress: test:after:run: hello retry test',
      'plugin test:ended',

      'mocha: test: hello retry test',
      'plugin test:started',

      ...whenCoverage('mocha: hook: "before each" hook'),
      'cypress: test:before:run: hello retry test',
      ...whenCoverage('mocha: hook end: "before each" hook'),
      'mocha: pass: hello retry test',
      'mocha: test end: hello retry test',
      ...whenCoverage('mocha: hook: "after each" hook'),
      ...whenCoverage('mocha: hook end: "after each" hook'),
      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello retry test',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});
