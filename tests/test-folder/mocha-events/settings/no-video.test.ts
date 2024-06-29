import { checkCyResults, createResTest2 } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('test video event', () => {
  const res = createResTest2(
    [
      `
describe('test video false', () => {

  it('test fails', () => {
    cy.wait(3000);
    cy.wrap(null).then(()=> {
       throw new Error('on purpose')
    })
  });
  
  it('test pass', () => {});
});
`,
    ],
    { video: 'false' },
  );

  describe('check results', () => {
    let results: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
    });

    it('check cypress results', () => {
      checkCyResults(res?.result?.res, { totalPassed: 1, totalFailed: 1 });
    });

    it('check test with fail exists', async () => {
      const test = results.find(t => t.name === 'test fails');
      expect(test).toBeDefined();
    });

    it('check test with pass exists', async () => {
      const test = results.find(t => t.name === 'test pass');
      expect(test).toBeDefined();
    });

    // todo check no video
  });
});
