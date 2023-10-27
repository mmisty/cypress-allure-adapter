import { createResTest2, mapSteps } from '../../../cy-helper/utils';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';

describe('should skip hooks steps with asterisk', () => {
  const res = createResTest2(
    [
      `
  describe('suite', { defaultCommandTimeout: 500 },() => {
   before(()=> {
      cy.log('before');
    });
    before('Named', ()=> {
      cy.log('before');
    });
    
    after(()=> {
      cy.log('after');
    });
    
    after("NAMED HOOK", ()=> {
      cy.log('after');
    });
    
    beforeEach(()=> {
      cy.log('before each');
    });
     beforeEach('Named', ()=> {
      cy.log('before each');
    });
    
    afterEach('Named', ()=> {
      cy.log('after each');
    });
    afterEach(()=> {
      cy.log('after each');
    });

  it('test1', () => {
    cy.log('test1');
  });
  
});

`,
    ],
    {
      allureSkipSteps:
        '"before each" hook*,"after each" hook*,"before all" hook*,' +
        '"after all" hook*,*generateReport,*mergeUnitTestCoverage,*collectBackendCoverage',
    },
  );
  describe('check results', () => {
    let resAllure: AllureTest[];

    beforeAll(() => {
      resAllure = parseAllure(res.watch);
    });

    it('should check before each/after each hooks (keep only named hooks)', () => {
      const tests = resAllure.filter(t => t.name === 'test1');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        status: t.status,
        name: t.name?.replace(/\d{4,}/g, 'number'),
      }));

      expect(steps).toEqual([
        {
          name: 'log: test1',
          status: 'passed',
          steps: [],
        },
      ]);
    });

    it('should check before all/after all hooks', () => {
      const tests = resAllure.filter(t => t.name === 'test1');
      expect(tests.length).toEqual(1);

      const befores = getParentsArray(tests[0]).flatMap(
        t =>
          t.befores?.map(x => ({
            name: (x as any).name,
            steps: mapSteps(x.steps, y => ({
              status: y.status,
              name: y.name?.replace(/\d{4,}/g, 'number'),
            })),
          })),
      );

      const afters = getParentsArray(tests[0]).flatMap(
        t =>
          t.afters?.map(x => ({
            name: (x as any).name,
            steps: mapSteps(x.steps, y => ({
              status: y.status,
              name: y.name?.replace(/\d{4,}/g, 'number'),
            })),
          })),
      );

      expect({ befores, afters }).toEqual({
        afters: [
          {
            name: 'video',
            steps: [],
          },
        ],
        befores: [],
      });
    });
  });
});
