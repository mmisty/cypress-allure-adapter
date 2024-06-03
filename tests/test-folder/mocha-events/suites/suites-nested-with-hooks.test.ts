import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { getParentsArray, parseAllure } from 'allure-js-parser';

describe('several nested suites with global hook - hook should be added to all parents', () => {
  const res = createResTest2([
    `
describe('hello suite', () => {
  describe('child suite', () => {
    before('Child hook', () => {
      cy.log('before');
    });
    
    it('hello test', () => {
      cy.log('message');
    });
    
    after('Child after hook', () => {
      cy.log('after');
    });
  });
});
`,
  ]);

  describe('check results', () => {
    let resFixed;

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(1);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite child suite hello test',
      ]);
    });

    it('suites parents', () => {
      expect(
        resFixed.map(t => ({
          name: t.name,
          status: t.status,
          parents: getParentsArray(t).map(z => ({
            name: z.name,
            befores: z.befores
              ?.filter(x => (x as any).name !== '"before all" hook')
              ?.map(x => ({ status: x.status, name: (x as any).name })),
            afters: z.afters
              ?.filter(x => (x as any).name !== '"after all" hook')
              ?.filter(x => (x as any).name.indexOf('Coverage') === -1)
              ?.filter(x => (x as any).name.indexOf('generateReport') === -1)
              ?.map(x => ({ status: x.status, name: (x as any).name })),
          })),
        })),
      ).toEqual([
        {
          name: 'hello test',
          parents: [
            {
              befores: [
                {
                  name: '"before all" hook: Child hook',
                  status: 'passed',
                },
              ],
              afters: [
                {
                  name: '"after all" hook: Child after hook',
                  status: 'passed',
                },
                {
                  name: 'video',
                  status: 'passed',
                },
              ],
              name: 'child suite',
            },
            {
              befores: [],
              afters: [],
              name: 'hello suite',
            },
          ],
          status: 'passed',
        },
      ]);
    });
  });
});
