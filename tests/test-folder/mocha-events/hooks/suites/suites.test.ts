import { createResTest2, generateChecksTests, TestData } from '@test-utils';

describe('suites diff tests', () => {
  // test
  const testsForOneCyRun: TestData[] = ['before-and-after-failure.ts'].map(
    x => require(`${__dirname}/${x}`).default,
  );

  const res = createResTest2(
    testsForOneCyRun.map(x => x.spec),
    { allureAddVideoOnPass: 'false' /* DEBUG: 'true'*/ },
  );

  generateChecksTests(res, testsForOneCyRun);
});
