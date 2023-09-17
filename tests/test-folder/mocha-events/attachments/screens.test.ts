import {
  checkCyResults,
  covergeAfterAllEvent,
  createResTest2,
  whenCoverage,
  whenNoCoverage,
} from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { readFileSync } from 'fs';
import { extname } from '../../../../src/common';
import {
  beforeStr,
  suiteStr,
  testStr,
  visitHtmlStr,
} from '../../../cy-helper/test-compose';

describe('test screenshot when fail in before (several screenshots)', () => {
  const res = createResTest2(
    [
      suiteStr('test screenshot', [
        beforeStr([visitHtmlStr, 'cy.screenshot();']),
        beforeStr(['cy.get("div").should("exist");']), // this fails
        testStr('test fail', ['cy.log("hello")']),
      ]),
    ],
    {
      allureAddVideoOnPass: 'false',
      DEBUG: 'true',
    },
  );

  describe('check results', () => {
    let results: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
    });

    it('should have correct events', async () => {
      const testt = readFileSync(res.specs[0]);
      expect(
        testt
          .toString()
          .split('\n')
          .filter(t => t !== ''),
      ).toEqual([
        'mocha: start',
        'mocha: suite: , ',
        ...whenCoverage('mocha: hook: "before all" hook'),
        ...whenCoverage('cypress: test:before:run: test fail'),
        ...whenCoverage('mocha: hook end: "before all" hook'),
        'mocha: suite: test screenshot, test screenshot',
        'mocha: hook: "before all" hook',
        ...whenNoCoverage('cypress: test:before:run: test fail'),
        //'mocha: hook end: "before all" hook',
        //'mocha: hook: "before all" hook',
        'cypress:screenshot:test screenshot -- test fail -- before all hook.png',
        'mocha: hook end: "before all" hook',
        'mocha: hook: "before all" hook',
        'cypress:screenshot:test screenshot -- test fail -- before all hook (failed).png',
        'mocha: fail: "before all" hook for "test fail"',
        'mocha: suite end: test screenshot',
        ...whenCoverage(...covergeAfterAllEvent),
        'cypress: test:after:run: test fail',
        'plugin test:ended', // doesn't do anything

        'plugin test:started',
        'plugin test:ended',
        'mocha: suite end: ',
        'mocha: end',
      ]);
    });

    it('check cypress results', () => {
      checkCyResults(res?.result?.res, {
        totalPassed: 0,
        totalFailed: 1,
        totalSkipped: 0,
      });
    });

    it('check test with screenshot', async () => {
      const test = results.find(t => t.name === 'test fail');
      // there are before all hooks for coverage
      expect(test).toBeDefined();
      expect({
        status: test!.status,
        attach: test!.attachments.map(t => ({
          ...t,
          name: t.name.replace(/\d{3,}/g, 'number'),
          source: `source${extname(t.source)}`,
          length:
            readFileSync(`${res.watch}/${t.source}`).toString().length > 0,
        })),
      }).toEqual({
        attach: [
          {
            length: true,
            name: 'test screenshot -- test fail -- before all hook.png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            length: true,
            name: 'test screenshot -- test fail -- before all hook (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            length: true,
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        status: 'failed',
      });
    });
  });
});
