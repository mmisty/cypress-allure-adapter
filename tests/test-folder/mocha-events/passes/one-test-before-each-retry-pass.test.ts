import { createResTest2 } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events', () => {
  const res = createResTest2([
    `
describe('hello suite', { retries: 2 }, () => {
  beforeEach(() => {
    if (Cypress.currentRetry < 1) {
      cy.wrap(null).then(() => {
          throw new Error('Test FAIL on purpose');
      });
    }
  });
  
  it('hello retry test', () => {
    cy.log('123');
  });
});
`,
  ]);

  it('should have correct events for one test with retry in before each passed', async () => {
    const testt = readFileSync(res.specs[0]);
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
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: hello retry test',
      'mocha: hook end: "before each" hook',
      'mocha: retry: hello retry test',
      'cypress: test:after:run: hello retry test',
      'plugin test:ended',

      'mocha: test: hello retry test',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: hello retry test',
      'mocha: hook end: "before each" hook',
      'mocha: pass: hello retry test',
      'mocha: test end: hello retry test',

      'mocha: suite end: hello suite',

      'cypress: test:after:run: hello retry test',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});