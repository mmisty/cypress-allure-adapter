import { AllureTest, parseAllure } from 'allure-js-parser';
import { createResTest, fixResult } from '../../cy-helper/utils';

describe('run one test', () => {
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
        ...Array.from('x'.repeat(TESTS_COUNT)).map((v, i) => `before each fail test ${`0${i + 1}`.slice(-2)}`),
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
  });
});
