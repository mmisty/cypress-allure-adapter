import { createResTest2, fixResult } from '@test-utils';
import { parseAllure } from 'allure-js-parser';

describe('several tests run by describe.only', () => {
  const res = createResTest2(
    [
      `
describe.only('hello suite', () => {
  it('hello test 1', () => {
    cy.log('message');
  });
  
  it('hello test 2', () => {
    cy.log('message');
  });
  
  it('hello test 3', () => {
    cy.log('message');
  });
  
  it('hello test 4', () => {
    cy.log('message');
  });
});
`,
    ],
    { allureAddVideoOnPass: 'true' },
  );

  describe('check results', () => {
    let resFixed;

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(4);
    });

    it('check results', async () => {
      expect((res.result.res as any)?.totalSkipped).toEqual(0);
      expect((res.result.res as any)?.totalPending).toEqual(0);
      expect((res.result.res as any)?.totalPassed).toEqual(4);
      expect((res.result.res as any)?.totalFailed).toEqual(0);
    });
  });
});
