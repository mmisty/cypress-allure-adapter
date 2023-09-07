import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';

describe('suite overrides - delete labels', () => {
  const res = createResTest2([
    `
describe('parent suite', () => {
  describe('child suite', () => {
    describe('deep child suite', () => {
      it('test 1', () => {
        cy.allure().parentSuite();
        cy.allure().suite();
        cy.allure().subSuite();
        cy.log('message');
      });
    });
  });
});
`,
  ]);

  describe('check results', () => {
    let resFixed;
    let results: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(1);
    });

    it('suites', () => {
      expect(
        results.map(t => ({
          name: t.name,
          status: t.status,
          parents: getParentsArray(t).map(t => t.name),
        })),
      ).toEqual([
        {
          name: 'test 1',
          parents: ['deep child suite', 'child suite', 'parent suite'],
          status: 'passed',
        },
      ]);
    });

    it('check suite labels', async () => {
      expect(
        resFixed
          .map(t => ({ labels: t.labels, name: t.name }))
          .sort((a, b) => (a.name < b.name ? -1 : 1))
          .map(t => ({
            ...t,
            labels: t.labels.filter(
              x =>
                x.name === 'suite' ||
                x.name === 'parentSuite' ||
                x.name === 'subSuite',
            ),
          })),
      ).toEqual([
        {
          labels: [],
          name: 'test 1',
        },
      ]);
    });
  });
});
