import { covergeAfterAllEvent, createResTest2, whenCoverage, whenNoCoverage } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('one simple passed test with global after all hook', () => {
  const res = createResTest2([
    `
    after(() => {
      cy.log('after global');
    });
    
    describe('hello suite', () => {
      it('hello test', () => {
        cy.log('message');
      });
    });
`,
  ]);

  it('should have correct events for one test with after all global', async () => {
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
        'cypress: test:before:run: hello test',
        'mocha: hook end: "before all" hook',
      ),
      'mocha: suite: hello suite, hello suite',
      'mocha: test: hello test',
      'plugin test:started',
      ...whenNoCoverage('cypress: test:before:run: hello test'),
      ...whenCoverage('mocha: hook: "before each" hook'),
      ...whenCoverage('mocha: hook end: "before each" hook'),
      'mocha: pass: hello test',
      'mocha: test end: hello test',
      ...whenCoverage('mocha: hook: "after each" hook'),
      ...whenCoverage('mocha: hook end: "after each" hook'),
      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'mocha: hook: "after all" hook',
      'mocha: hook end: "after all" hook',
      'cypress: test:after:run: hello test',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});
