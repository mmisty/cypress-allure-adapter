import { createResTest2 } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events', () => {
  createResTest2([
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
    const testt = readFileSync(`${process.cwd()}/reports/test.log`);
    expect(
      testt
        .toString()
        .split('\n')
        .filter(t => t !== ''),
    ).toEqual([
      'mocha: start',
      'mocha: suite: , ',
      'mocha: suite: hello suite, hello suite',

      'mocha: test: hello retry test',
      'plugin test:started',
      'cypress: test:before:run: hello retry test',
      'mocha: retry: hello retry test',
      'cypress: test:after:run: hello retry test',
      'plugin test:ended',
      '******** test:after:run=hello retry test',

      'mocha: test: hello retry test',
      'plugin test:started',
      'cypress: test:before:run: hello retry test',
      'mocha: pass: hello retry test',
      'mocha: test end: hello retry test',
      'mocha: suite end: hello suite null',
      'cypress: test:after:run: hello retry test',
      'plugin test:ended',
      '******** test:after:run=hello retry test',

      'mocha: suite end:  integration/e2e/temp/test0.cy.ts',
      'mocha: end',
    ]);
  });
});
