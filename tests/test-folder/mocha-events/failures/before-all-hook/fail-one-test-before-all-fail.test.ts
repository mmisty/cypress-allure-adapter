import { createResTest2 } from '../../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events - check failures', () => {
  const res = createResTest2([
    `
describe('hello suite', () => {
  before(() => {
    cy.wrap(null).then(() => {
      throw new Error('Test FAIL on purpose');
    });
  });
  
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
      'mocha: suite: hello suite, hello suite',
      'mocha: hook: "before all" hook',
      'cypress: test:before:run: hello test',
      'mocha: fail: "before all" hook for "hello test"',
      'mocha: suite end: hello suite',
      'cypress: test:after:run: hello test',
      'plugin test:ended', // doesn't do anything

      'plugin test:started',
      'plugin test:ended',
      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});
