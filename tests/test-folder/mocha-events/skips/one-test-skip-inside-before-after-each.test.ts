import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { parseAllure } from 'allure-js-parser';

describe('mocha events', () => {
  const res = createResTest2(
    [
      `
describe('hello suite', () => {
  beforeEach(() => {
    cy.log('beforeEach');
  });
  it('hello test', function (){
    cy.log('message');
    this.skip();
  });
  afterEach(() => {
    cy.log('afterEach');
  });
});
`,
    ],
    { allureAddVideoOnPass: 'true' },
  );

  it('should have correct events for one skipped test', async () => {
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
      'mocha: hook: "before each" hook',
      'cypress: test:before:run: hello test',
      'mocha: hook end: "before each" hook',

      'mocha: pending: hello test',
      'mocha: test: hello test',
      'plugin test:started',
      'mocha: test end: hello test',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      'mocha: suite end: hello suite',
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
