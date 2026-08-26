import { checkCyResults, createResTest2 } from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('test duration event', () => {
  const res = createResTest2([
    `
describe('test duration', () => {

  it('hello test', () => {
    cy.wait(200);
  });
  
  it('quick test', () => {});
});
`,
  ]);

  describe('check results', () => {
    let results: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
    });

    it('check cypress results', () => {
      checkCyResults(res?.result?.res, { totalPassed: 2 });
    });

    it('check test duration long', async () => {
      const test = results.find(t => t.name === 'hello test');
      expect(test?.start).toBeDefined();
      expect(test?.stop).toBeDefined();
      expect(test!.stop! - test!.start!).toBeGreaterThanOrEqual(200);
    });

    it('check test duration quick', async () => {
      const test = results.find(t => t.name === 'quick test');
      expect(test?.start).toBeDefined();
      expect(test?.stop).toBeDefined();
      const duration = test!.stop! - test!.start!;
      console.log(duration);
      // there are before all hooks for coverage
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1000);
    });
  });
});
