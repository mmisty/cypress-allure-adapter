import { createResTest2 } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events', () => {
  createResTest2([
    `
    describe('hello suite', () => {
      beforeEach(() => {
        cy.log('before each');
      });
      
      it('hello test1', () => {
        cy.log('message1');
      });
      
      it('hello test2', () => {
        cy.log('message2');
      });
    });
`,
  ]);

  it('should have correct events for one test with before each for test', async () => {
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

      'mocha: test: hello test1',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: hello test1',
      'mocha: hook end: "before each" hook',
      'mocha: pass: hello test1',
      'mocha: test end: hello test1',
      'cypress: test:after:run: hello test1',
      'plugin test:ended',
      '******** test:after:run=hello test1',

      'mocha: test: hello test2',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: hello test2',
      'mocha: hook end: "before each" hook',
      'mocha: pass: hello test2',
      'mocha: test end: hello test2',
      'mocha: suite end: hello suite null',
      'cypress: test:after:run: hello test2',
      'plugin test:ended',
      '******** test:after:run=hello test2',

      'mocha: suite end:  integration/e2e/temp/test0.cy.ts',
      'mocha: end',
    ]);
  });
});
