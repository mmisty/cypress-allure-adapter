import { createResTest2 } from '../../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events - check failures', () => {
  const res = createResTest2([
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
  
  it('hello test 1', () => {
    cy.log('123');
  });
  
  it('hello test 2', () => {
    cy.log('123');
  });
  
  it('hello test 3', () => {
    cy.log('123');
  });
  
  it('hello test 4', () => {
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
      'cypress: test:before:run: hello test 1',
      'mocha: fail: "before all" hook for "hello test 1"',
      'cypress: test:after:run: hello test 1',
      'plugin test:ended', // should not be here
      'mocha: suite: hello suite, hello suite',

      'plugin test:started',
      'plugin test:ended',

      'plugin test:started',
      'plugin test:ended',

      'plugin test:started',
      'plugin test:ended',

      'plugin test:started',
      'plugin test:ended',

      'mocha: suite end: hello suite',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});
