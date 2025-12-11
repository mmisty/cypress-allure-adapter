import { expect } from 'expect';
import {
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';

describe('synthetic tests creation - fails in test then in hook when retries', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'true' },
    });
  });

  it('should have 12 tests', () => {
    expect(results.watchResults.length).toEqual(12);
  });

  it('should have correct cypress results', () => {
    expect((results.cypressResults as any)?.totalFailed).toEqual(1);
    expect((results.cypressResults as any)?.totalPassed).toEqual(4);
  });

  it('tests should have correct names', () => {
    expect(results.watchResults.map(t => t.fullName).sort()).toEqual([
      'before each fail with retry - first in test then in hook test 01',
      'before each fail with retry - first in test then in hook test 02',
      'before each fail with retry - first in test then in hook test 03',
      'before each fail with retry - first in test then in hook test 04',
      'before each fail with retry - first in test then in hook test 05',
      'before each fail with retry - first in test then in hook test 05',
      'before each fail with retry - first in test then in hook test 05',
      'before each fail with retry - first in test then in hook test 06',
      'before each fail with retry - first in test then in hook test 07',
      'before each fail with retry - first in test then in hook test 08',
      'before each fail with retry - first in test then in hook test 09',
      'before each fail with retry - first in test then in hook test 10',
    ]);
  });

  it('tests should have correct statuses and messages', () => {
    const testDetails = results.watchResults
      .map(t => ({
        fullName: t.fullName,
        name: t.name,
        status: t.status,
        message: t.statusDetails.message,
        start: t.start,
      }))
      .sort((a, b) => (a.name && b.name && a.name < b.name ? -1 : 1))
      .map(x => ({ ...x, start: undefined }));

    expect(testDetails).toEqual([
      {
        fullName:
          'before each fail with retry - first in test then in hook test 01',
        name: 'test 01',
        status: 'passed',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 02',
        name: 'test 02',
        status: 'passed',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 03',
        name: 'test 03',
        status: 'passed',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 04',
        name: 'test 04',
        status: 'passed',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 05',
        message: 'Fail in test',
        name: 'test 05',
        status: 'failed',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 05',
        message: 'Fail in test',
        name: 'test 05',
        status: 'failed',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 05',
        message:
          'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
        name: 'test 05',
        status: 'failed',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 06',
        message:
          'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
        name: 'test 06',
        status: 'unknown',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 07',
        message:
          'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
        name: 'test 07',
        status: 'unknown',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 08',
        message:
          'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
        name: 'test 08',
        status: 'unknown',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 09',
        message:
          'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
        name: 'test 09',
        status: 'unknown',
      },
      {
        fullName:
          'before each fail with retry - first in test then in hook test 10',
        message:
          'Fail in hook\n\nBecause this error occurred during a `before each` hook we are skipping the remaining tests in the current suite: `before each fail with retry...`',
        name: 'test 10',
        status: 'unknown',
      },
    ]);
  });
});
