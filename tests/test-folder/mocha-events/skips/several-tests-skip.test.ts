import {
  covergeAfterAllEvent,
  createResTest2,
  fixResult,
  sortAttachments,
  whenCoverage,
  whenNoCoverage,
} from '../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { parseAllure } from 'allure-js-parser';

describe('several tests skipped by .skip', () => {
  const res = createResTest2(
    [
      `
describe('hello suite', () => {
  it.skip('hello test 1', () => {
    cy.log('message');
  });
  
  it.skip('hello test 2', () => {
    cy.log('message');
  });
  
  it.skip('hello test 3', () => {
    cy.log('message');
  });
  
  it.skip('hello test 4', () => {
    cy.log('message');
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
      ...whenCoverage(
        'mocha: hook: "before all" hook',
        'cypress: test:before:run: hello test 1',
        'mocha: hook end: "before all" hook',
      ),
      'mocha: suite: hello suite, hello suite',
      'mocha: pending: hello test 1',

      ...whenNoCoverage('cypress: test:before:run: hello test 1'),
      'mocha: test: hello test 1',
      'plugin test:started',
      'cypress: test:after:run: hello test 1',
      'plugin test:ended',

      'mocha: test end: hello test 1',

      'mocha: pending: hello test 2',
      'cypress: test:before:run: hello test 2',
      'mocha: test: hello test 2',
      'plugin test:started',
      'cypress: test:after:run: hello test 2',
      'plugin test:ended',

      'mocha: test end: hello test 2',

      'mocha: pending: hello test 3',
      'cypress: test:before:run: hello test 3',
      'mocha: test: hello test 3',
      'plugin test:started',
      'cypress: test:after:run: hello test 3',
      'plugin test:ended',

      'mocha: test end: hello test 3',

      'mocha: pending: hello test 4',
      'cypress: test:before:run: hello test 4',
      'mocha: test: hello test 4',
      'plugin test:started',
      'mocha: test end: hello test 4',

      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello test 4',
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
      expect(resFixed.length).toEqual(4);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite hello test 1',
        'hello suite hello test 2',
        'hello suite hello test 3',
        'hello suite hello test 4',
      ]);
    });

    it('check attachments', async () => {
      expect(sortAttachments(resFixed)).toEqual([
        [
          {
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        [
          {
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        [
          {
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
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
      ).toEqual([
        [{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }],
        [{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }],
        [{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }],
        [{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }],
      ]);
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
        [
          {
            name: 'package',
            value: 'integration.e2e.temp.test_0_number.cy.ts',
          },
        ],
        [
          {
            name: 'package',
            value: 'integration.e2e.temp.test_0_number.cy.ts',
          },
        ],
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
