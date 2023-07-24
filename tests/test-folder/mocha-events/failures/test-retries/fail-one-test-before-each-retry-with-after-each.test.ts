import { createResTest2 } from '../../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events - check failures', () => {
  createResTest2([
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
  
  afterEach(() => {
    cy.log('after');
  });
});
`,
  ]);

  it('should have correct events for one test failed with retry with afterEach', async () => {
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

      'mocha: test: hello test',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: hello test',
      'mocha: hook end: "before each" hook',
      'mocha: retry: hello test',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: hello test',
      'plugin test:ended',
      '******** test:after:run=hello test',

      'mocha: test: hello test',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: hello test',
      'mocha: fail: "before each" hook for "hello test"',
      'plugin test:ended', // not expected here
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      // should be here 'plugin test:ended',
      'mocha: suite end: hello suite null',
      'cypress: test:after:run: hello test',
      'plugin test:ended', // not expected here
      '******** test:after:run=hello test',

      'mocha: suite end:  integration/e2e/temp/test0.cy.ts',
      'mocha: end',
    ]);
  });
});
