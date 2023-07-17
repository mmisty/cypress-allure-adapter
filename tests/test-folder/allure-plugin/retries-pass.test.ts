import { AllureTest, parseAllure } from 'allure-js-parser';
import { createResTest, fixResult } from '../../cy-helper/utils';

describe('run retries test', () => {
  // todo create test right in code
  const storeResDir = createResTest('retries-pass');

  describe(`${storeResDir}: retries-pass`, () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(storeResDir);
      resFixed = fixResult(results);
    });

    const storeResDir = createResTest(__filename);

    it('check results', () => {
      expect(
        resFixed.sort((a, b) => (a.stop && b.stop && a.stop < b.stop ? 1 : -1)).map(t => [t.name, t.status]),
      ).toEqual([
        ['should pass on retries', 'passed'],
        ['should pass on retries', 'failed'],
      ]);
    });

    it('check attachments', () => {
      expect(
        resFixed
          .sort((a, b) => (a.stop && b.stop && a.stop < b.stop ? 1 : -1))
          .map(t => [t.name, t.status, t.attachments]),
      ).toEqual([
        [
          'should pass on retries',
          'passed',
          [
            {
              name: 'retries-pass.cy.ts.mp4',
              source: 'source.mp4',
              type: 'video/mp4',
            },
          ],
        ],
        [
          'should pass on retries',
          'failed',
          [
            {
              name: 'retries pass on second retry -- should pass on retries (failed).png',
              source: 'source.png',
              type: 'image/png',
            },
            {
              name: 'retries-pass.cy.ts.mp4',
              source: 'source.mp4',
              type: 'video/mp4',
            },
          ],
        ],
      ]);
    });
  });
});
