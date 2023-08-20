import {
  covergeAfterAllEvent,
  createResTest2,
  whenCoverage,
} from '../../../../cy-helper/utils';
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
      'mocha: hook: "before all" hook',
      'cypress: test:before:run: hello test',
      ...whenCoverage('mocha: hook end: "before all" hook'),
      ...whenCoverage('mocha: hook: "before all" hook'),
      'mocha: fail: "before all" hook for "hello test"',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello test',
      'plugin test:ended',
      'mocha: suite: hello suite, hello suite',
      'plugin test:started',
      'plugin test:ended',
      'mocha: suite end: hello suite',
      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});
