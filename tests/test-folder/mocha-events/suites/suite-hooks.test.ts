import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';

describe('should apply all global hooks for test', () => {
  const res = createResTest2([
    `
before('0', ()=> {
  cy.log('step before 0')
})
after('0', ()=> {
  cy.log('step after 0')
})

describe('parent suite', () => {
  before('1', ()=> {
    cy.log('step before 1')
  })
  
  after('1', ()=> {
    cy.log('step after 1')
  })
  
  describe('child suite', () => {
    before('2', ()=> {
      cy.log('step before 2')
    })
    
    after('2', ()=> {
      cy.log('step after 2')
    })
    
    describe('deep child suite', () => {
      before('3', ()=> {
        cy.log('step before 3')
      })
      
      after('3', ()=> {
        cy.log('step after 3')
      })
      
      it('test 1', () => {
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

    it('check tests parents', async () => {
      expect(results.map(t => getParentsArray(t.parent))).toEqual(['s']);
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
  });
});
