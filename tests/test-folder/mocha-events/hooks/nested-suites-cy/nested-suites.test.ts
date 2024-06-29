import { createResTest2, generateChecksTests, TestData } from '@test-utils';

describe('nested suites', () => {
  // test
  const testsForOneCyRun: TestData[] = [
    'nested-suite-before-fail-01.ts',
    'nested-suite-before-pass-02.ts',
    'nested-suite-before-fail-simple-03.ts',
    'nested-suite-after-fail-simple-04.ts',
    'nested-suite-with-global-hook-05.ts',
    'nested-suite-after-pass-06.ts',
    'nested-suite-pass-07.ts',
  ].map(x => require(`${__dirname}/${x}`).default);

  const res = createResTest2(
    testsForOneCyRun.map(x => x.spec),
    { allureAddVideoOnPass: 'true' /* DEBUG: 'true'*/ },
  );

  generateChecksTests(res, testsForOneCyRun);
});
