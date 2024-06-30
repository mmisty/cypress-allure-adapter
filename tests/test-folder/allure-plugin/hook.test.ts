import { AllureTest, parseAllure } from 'allure-js-parser';
import { createResTest, fixResult } from '@test-utils';

describe('run before-each-fail', () => {
  // todo create test right in code
  const storeResDir = createResTest('before-each-fail');

  describe(`${storeResDir}: before-each-fail`, () => {
    let resFixed: AllureTest[];
    const TESTS_COUNT = 30;

    beforeAll(() => {
      const results = parseAllure(storeResDir);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      // last test twice because retried (todo)
      expect(resFixed.length).toEqual(TESTS_COUNT + 1);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        ...Array.from('x'.repeat(TESTS_COUNT)).map(
          (v, i) => `before each fail test ${`0${i + 1}`.slice(-2)}`,
        ),
        // last test twice because retried (todo)
        `before each fail test ${`0${TESTS_COUNT}`.slice(-2)}`,
      ]);
    });

    it('check attachments', async () => {
      expect(resFixed.map(t => t.attachments).sort()).toEqual(
        // last test twice because retried (todo)
        Array.from('x'.repeat(TESTS_COUNT + 1)).map((_v, _i) => [
          {
            name: 'before-each-fail.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ]),
      );
    });

    it('check path label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'path')),
      ).toEqual(
        // last test twice because retried (todo)
        Array.from('x'.repeat(TESTS_COUNT + 1)).map((_v, _i) => [
          {
            name: 'path',
            value: 'integration/e2e/hooks/before-each-fail.cy.ts',
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
        // last test twice because retried (todo)
        Array.from('x'.repeat(TESTS_COUNT + 1)).map((_v, _i) => [
          {
            name: 'package',
            value: 'integration.e2e.hooks.before-each-fail.cy.ts',
          },
        ]),
      );
    });

    it('check parentSuite label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'parentSuite')),
      ).toEqual(
        // last test twice because retried (todo)
        Array.from('x'.repeat(TESTS_COUNT + 1)).map((_v, _i) => [
          {
            name: 'parentSuite',
            value: 'before each fail',
          },
        ]),
      );
    });

    it('check suite label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'suite')),
      ).toEqual(
        // last test twice because retried (todo)
        Array.from('x'.repeat(TESTS_COUNT + 1)).map((_v, _i) => []),
      );
    });

    it('check descriptionHtml - should be added path', async () => {
      expect(resFixed.map(t => t.descriptionHtml).sort()).toEqual([
        // last test twice because retried (todo)
        ...Array.from('x'.repeat(TESTS_COUNT - 1)).map(
          (_v, _i) => 'integration/e2e/hooks/before-each-fail.cy.ts',
        ),

        // todo
        'integration/e2e/hooks/before-each-fail.cy.ts</br>integration/e2e/hooks/before-each-fail.cy.ts',
        'integration/e2e/hooks/before-each-fail.cy.ts</br>integration/e2e/hooks/before-each-fail.cy.ts</br>integration/e2e/hooks/before-each-fail.cy.ts',
      ]);
    });

    it('check status - should be failed for first test', async () => {
      expect(resFixed.map(t => t.status).sort()).toEqual([
        'failed',

        // last test twice because retried (todo)
        ...Array.from('x'.repeat(TESTS_COUNT)).map((_v, _i) => 'unknown'),
      ]);
    });

    it('check statusDetails - should be failed for first test', async () => {
      expect(
        resFixed
          .map(t => ({ name: t.name, msg: t.statusDetails?.message }))
          .sort((a, b) => (a.name && b.name && a.name < b.name ? -1 : 1)),
      ).toEqual([
        {
          msg: 'BEFORE EACH FAIL\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail`',
          name: 'test 01',
        },
        ...Array.from('x'.repeat(TESTS_COUNT - 1)).map((_v, i) => ({
          name: `test ${`0${i + 2}`.slice(-2)}`,
          msg: 'BEFORE EACH FAIL',
        })),
        // last test twice because retried (todo)
        {
          name: 'test 30',
          msg: 'BEFORE EACH FAIL',
        },
      ]);
    });
  });
});
