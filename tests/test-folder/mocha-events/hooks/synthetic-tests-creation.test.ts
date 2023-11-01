import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should have all hooks and steps inside', () => {
  const res = createResTest2(
    [
      `
describe('before each fail with retry - first in test then in hook @beforeEachRetry', { retries: 2 }, () => {
  beforeEach('Named hook', function () {
    cy.log('before each');

    if (Cypress.currentRetry > 1 && this.currentTest?.title?.indexOf('test 05') !== -1) {
      cy.wrap(null).then(() => {
        throw new Error('Fail in hook');
      });
    }
  });

  for (let i = 1; i <= 10; i++) {
    it('test ' + ('0'+i).slice(-2), function () {
      cy.log('test ' + i);

      if (this.test?.title.indexOf('test 05') !== -1) {
        cy.wrap(null).then(() => {
          throw new Error('Fail in test');
        });
      }
    });
  }
});

`,
    ],
    { allureAddVideoOnPass: 'true' },
  );

  describe('check results', () => {
    let resFixed: AllureTest[];
    let results: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(12);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'before each fail with retry - first in test then in hook @beforeEachRetry test 01',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 02',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 03',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 04',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 05',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 05',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 05',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 06',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 07',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 08',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 09',
        'before each fail with retry - first in test then in hook @beforeEachRetry test 10',
      ]);
    });

    it('check statuses and details', () => {
      expect(
        results
          .map(t => ({
            fullName: t.fullName,
            name: t.name,
            status: t.status,
            message: t.statusDetails.message,
            start: t.start,
          }))
          .sort((a, b) => (a.start && b.start && a.start < b.start ? -1 : 1))
          .map(x => ({ ...x, start: undefined })),
      ).toEqual([
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 01',
          name: 'test 01',
          status: 'passed',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 02',
          name: 'test 02',
          status: 'passed',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 03',
          name: 'test 03',
          status: 'passed',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 04',
          name: 'test 04',
          status: 'passed',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 05',
          message: 'Fail in test',
          name: 'test 05',
          status: 'failed',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 05',
          message: 'Fail in test',
          name: 'test 05',
          status: 'failed',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 05',
          message:
            'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
          name: 'test 05',
          status: 'failed',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 06',
          message:
            'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
          name: 'test 06',
          status: 'unknown',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 07',
          message:
            'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
          name: 'test 07',
          status: 'unknown',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 08',
          message:
            'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
          name: 'test 08',
          status: 'unknown',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 09',
          message:
            'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
          name: 'test 09',
          status: 'unknown',
        },
        {
          fullName:
            'before each fail with retry - first in test then in hook @beforeEachRetry test 10',
          message:
            'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
          name: 'test 10',
          status: 'unknown',
        },
      ]);
    });
  });
});
