import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { parseAllure } from 'allure-js-parser';

describe('mocha events - check failures @correct', () => {
  const res = createResTest2([
    `
describe('hello suite', () => {
  it('hello test', () => {
    cy.wrap(null).then(() => {
        throw new Error('Test FAIL on purpose');
    });
  });
});
`,
  ]);

  it('should have correct events for one test failed', async () => {
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
      'mocha: fail: hello test',
      'mocha: test end: hello test',
      'mocha: suite end: hello suite', /// this should go after test end
      'cypress: test:after:run: hello test',
      'plugin test:ended',

      'mocha: suite end: ',
      'mocha: end',
    ]);
  });

  describe('check results', () => {
    let resFixed;

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(1);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual(['hello suite hello test']);
    });

    it('check attachments', async () => {
      expect(resFixed.map(t => t.attachments).sort()).toEqual([
        [
          {
            name: 'hello suite -- hello test (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
      ]);
    });

    it('check path label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'path')),
      ).toEqual([[{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }]]);
    });

    it('check package label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'package')),
      ).toEqual([
        [
          {
            name: 'package',
            value: 'integration.e2e.temp.test_0_number.cy.ts',
          },
        ],
      ]);
    });
  });
});