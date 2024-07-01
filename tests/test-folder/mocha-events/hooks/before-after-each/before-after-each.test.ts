import {
  createResTest2,
  generateChecksTests,
  selectTestsToRun,
} from '@test-utils';
import { basename } from 'path';

describe(`suite: ${basename(__dirname)}`, () => {
  const testsForOneCyRun = selectTestsToRun(__dirname);

  const res = createResTest2(
    testsForOneCyRun.map(x => x.spec),
    { allureAddVideoOnPass: 'false' /*DEBUG: 'true'*/ },
  );

  generateChecksTests(res, testsForOneCyRun);
});
