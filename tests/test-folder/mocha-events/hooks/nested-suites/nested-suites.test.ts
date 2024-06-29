import { createResTest2, generateChecksTests, TestData } from '@test-utils';
import { globSync } from 'fast-glob';

describe('nested suites', () => {
  const testsForOneCyRun: TestData[] = globSync(`${__dirname}/data-*.ts`).map(
    x => require(`${x}`).default,
  );

  const res = createResTest2(
    testsForOneCyRun.map(x => x.spec),
    { allureAddVideoOnPass: 'true' /* DEBUG: 'true'*/ },
  );

  generateChecksTests(res, testsForOneCyRun);
});
