import { createResTest2 } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events', () => {
  const res = createResTest2([
    `
    describe('hello suite', () => {
      afterEach(() => {
        cy.log('after each');
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

  it('should have correct events for one test with after each for test', async () => {
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

      'mocha: test: hello test1',
      'plugin test:started',
      'cypress: test:before:run: hello test1',
      'mocha: pass: hello test1',
      'mocha: test end: hello test1',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'cypress: test:after:run: hello test1',
      'plugin test:ended',

      'mocha: test: hello test2',
      'plugin test:started',
      'cypress: test:before:run: hello test2',
      'mocha: pass: hello test2',
      'mocha: test end: hello test2',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'mocha: suite end: hello suite',
      'cypress: test:after:run: hello test2',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});
