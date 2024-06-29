import {
  createResTest2,
  generateChecksTests,
  selectTestsToRun,
} from '@test-utils';

describe('nested suites', () => {
  const testsForOneCyRun = selectTestsToRun(__dirname);

  const res = createResTest2(
    testsForOneCyRun.map(x => x.spec),
    { allureAddVideoOnPass: 'true' /* DEBUG: 'true'*/ },
  );

  generateChecksTests(res, testsForOneCyRun);
});
