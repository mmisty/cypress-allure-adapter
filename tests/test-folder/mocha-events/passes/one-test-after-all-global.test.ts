import { createResTest2 } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';

describe('mocha events', () => {
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
      'mocha: suite: hello suite, hello suite',
      'mocha: test: hello test',
      'plugin test:started',
      'cypress: test:before:run: hello test',
      'mocha: pass: hello test',
      'mocha: test end: hello test',
      'mocha: suite end: hello suite',
      'mocha: hook: "after all" hook',
      'mocha: hook end: "after all" hook',
      'cypress: test:after:run: hello test',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });
});
