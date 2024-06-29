import { createResTest2, generateChecksTests, TestData } from '@test-utils';
import { basename } from 'path';
import { globSync } from 'fast-glob';

describe(`suite: ${basename(__dirname)}`, () => {
  const testsForOneCyRun: TestData[] = globSync(`${__dirname}/data-*.ts`).map(
    x => require(`${x}`).default,
  );

  const res = createResTest2(
    testsForOneCyRun.map(x => x.spec),
    { allureAddVideoOnPass: 'false' /* DEBUG: 'true'*/ },
  );

  generateChecksTests(res, testsForOneCyRun);
});
