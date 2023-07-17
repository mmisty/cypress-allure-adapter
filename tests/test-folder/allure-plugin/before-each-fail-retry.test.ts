import { AllureTest, parseAllure } from 'allure-js-parser';
import { createResTest, fixResult } from '../../cy-helper/utils';

describe('run before-each-fail-retry', () => {
  // todo create test right in code
  const storeResDir = createResTest('before-each-fail-retry');

  describe(`${storeResDir}: before-each-fail-retry`, () => {
    let resFixed: AllureTest[];
    const TESTS_COUNT = 30;
    const retries = 2;

    beforeAll(() => {
      const results = parseAllure(storeResDir);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(TESTS_COUNT * retries);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual(
        [
          ...Array.from('x'.repeat(TESTS_COUNT)).map(
            (v, i) => `before each fail with retry test ${`0${i + 1}`.slice(-2)}`,
          ),
          ...Array.from('x'.repeat(TESTS_COUNT)).map(
            (v, i) => `before each fail with retry test ${`0${i + 1}`.slice(-2)}`,
          ),
        ].sort(),
      );
    });

    it('check attachments', async () => {
      expect(
        resFixed
          .sort((a, b) => (a.name && b.name && a.name < b.name ? -1 : 1))
          .map(t => [t.name, t.status, t.attachments])
          .sort(),
      ).toEqual(
        [
          ...Array.from('x'.repeat(TESTS_COUNT)).map((_v, i) => [
            `test ${`0${i + 1}`.slice(-2)}`,
            'passed',
            [
              {
                name: 'before-each-fail-retry.cy.ts.mp4',
                source: 'source.mp4',
                type: 'video/mp4',
              },
            ],
          ]),
          ...Array.from('x'.repeat(TESTS_COUNT)).map((_v, i) => [
            `test ${`0${i + 1}`.slice(-2)}`,
            'failed',
            [
              {
                name: `before each fail with retry -- test ${`0${i + 1}`.slice(-2)} (failed).png`,
                source: 'source.png',
                type: 'image/png',
              },

              {
                name: 'before-each-fail-retry.cy.ts.mp4',
                source: 'source.mp4',
                type: 'video/mp4',
              },
            ],
          ]),
        ].sort(),
      );
    });

    it('check path label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'path')),
      ).toEqual(
        Array.from('x'.repeat(TESTS_COUNT * retries)).map((_v, _i) => [
          {
            name: 'path',
            value: 'integration/e2e/hooks/before-each-fail-retry.cy.ts',
          },
        ]),
      );
    });

    it('check package label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'package')),
      ).toEqual(
        Array.from('x'.repeat(TESTS_COUNT * retries)).map((_v, _i) => [
          {
            name: 'package',
            value: 'integration.e2e.hooks.before-each-fail-retry.cy.ts',
          },
        ]),
      );
    });

    it('check status - should be failed  and passed', async () => {
      expect(resFixed.map(t => t.status).sort()).toEqual([
        ...Array.from('x'.repeat(TESTS_COUNT)).map((_v, _i) => 'failed'),
        ...Array.from('x'.repeat(TESTS_COUNT)).map((_v, _i) => 'passed'),
      ]);
    });
  });
});
