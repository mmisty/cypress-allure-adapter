import { createResTest2 } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events', () => {
  createResTest2([
    `
    describe('hello suite', () => {
      afterEach(() => {
        cy.log('after each');
      });
      
      it('hello test', () => {
        cy.log('message');
      });
    });
`,
  ]);

  it('should have correct events for one test with after each for test', async () => {
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
      'cypress: test:before:run: hello test',
      'mocha: pass: hello test',
      'mocha: test end: hello test',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'mocha: suite end: hello suite null',
      'cypress: test:after:run: hello test',
      'plugin test:ended',
      '******** test:after:run=hello test',
      'mocha: suite end:  integration/e2e/temp/test0.cy.ts',
      'mocha: end',
    ]);
  });
});
