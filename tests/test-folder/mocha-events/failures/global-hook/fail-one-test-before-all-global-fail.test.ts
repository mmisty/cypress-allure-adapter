import { createResTest2 } from '../../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events - check failures', () => {
  createResTest2([
    `
before(() => {
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
    const testt = readFileSync(`${process.cwd()}/reports/test.log`);
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
      'mocha: fail: "before all" hook for "hello test"',
      'mocha: suite: hello suite, hello suite',
      'plugin test:started',
      'plugin test:ended',
      'mocha: suite end: hello suite null',
      'cypress: test:after:run: hello test',
      'plugin test:ended',
      '******** test:after:run=hello test',
      'mocha: suite end:  integration/e2e/temp/test0.cy.ts',
      'mocha: end',
    ]);
  });
});
