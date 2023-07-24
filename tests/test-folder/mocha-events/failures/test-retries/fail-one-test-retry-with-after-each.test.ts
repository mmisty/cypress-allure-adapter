import { covergeAfterAllEvent, createResTest2, whenCoverage, whenNoCoverage } from '../../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('one passed test with retries and after each', () => {
  const res = createResTest2([
    `
describe('hello suite', { retries: 1 }, () => {
  it('hello test', () => {
    cy.wrap(null).then(() => {
        throw new Error('Test FAIL on purpose');
    });
  });
  
  afterEach(()=> {
    cy.log('1');
  });
});
`,
  ]);

  it('should have correct events for one test failed with retry with after each', async () => {
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
      ...whenCoverage('mocha: hook: "before each" hook'),
      ...whenCoverage('mocha: hook end: "before each" hook'),
      ...whenNoCoverage('cypress: test:before:run: hello test'),
      'mocha: retry: hello test',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      ...whenCoverage('mocha: hook: "after each" hook'),
      ...whenCoverage('mocha: hook end: "after each" hook'),
      'cypress: test:after:run: hello test',
      'plugin test:ended',

      'mocha: test: hello test',
      'plugin test:started',
      ...whenCoverage('mocha: hook: "before each" hook'),
      'cypress: test:before:run: hello test',
      ...whenCoverage('mocha: hook end: "before each" hook'),
      'mocha: fail: hello test',
      'mocha: test end: hello test',
      ...whenCoverage('mocha: hook: "after each" hook'),
      ...whenCoverage('mocha: hook end: "after each" hook'),
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello test',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});
