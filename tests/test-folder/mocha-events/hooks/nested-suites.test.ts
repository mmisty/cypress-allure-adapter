import { createResTest2, generateChecksTests, TestData } from '@test-utils';

describe('nested suites', () => {
  const testsForOneCyRun: TestData[] = [
    'nested-suites-cy/nested-suite-before-fail-01.ts',
    'nested-suites-cy/nested-suite-before-pass-02.ts',
    'nested-suites-cy/nested-suite-before-fail-simple-03.ts',
  ].map(x => require(`${__dirname}/${x}`).default);

  const res = createResTest2(
    testsForOneCyRun.map(x => x.spec),
    { allureAddVideoOnPass: 'true' /* DEBUG: 'true'*/ },
  );

  generateChecksTests(res, testsForOneCyRun);
});
