import {
  covergeAfterAllEvent,
  createResTest2,
  readWithRetry,
  whenCoverage,
  whenNoCoverage,
} from '@test-utils';

describe('one passed test with global before hook', () => {
  const res = createResTest2([
    `
    beforeEach(() => {
      cy.log('before each global');
    });
    
    describe('hello suite', () => {
      it('hello test', () => {
        cy.log('message');
      });
    });
`,
  ]);

  it('should have correct events for one test with before each global', async () => {
    const testt = readWithRetry(res.specs[0]);
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
        'cypress: test:before:run: hello test',
        'mocha: hook end: "before all" hook',
      ),
      'mocha: suite: hello suite, hello suite',
      'mocha: test: hello test',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      ...whenNoCoverage('cypress: test:before:run: hello test'),
      'mocha: hook end: "before each" hook',
      ...whenCoverage('mocha: hook: "before each" hook'),
      ...whenCoverage('mocha: hook end: "before each" hook'),
      'mocha: pass: hello test',
      'mocha: test end: hello test',
      ...whenCoverage('mocha: hook: "after each" hook'),
      ...whenCoverage('mocha: hook end: "after each" hook'),
      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello test',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});
