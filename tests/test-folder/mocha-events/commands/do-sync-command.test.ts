import {
  checkCyResults,
  createResTest2,
  fixResult,
  mapSteps,
} from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('do sync command', () => {
  const res = createResTest2(
    [
      `
      
  Cypress.Commands.add('qaId', (qaId, options = {}) => {
    cy.get("[data-qa-id=" + qaId + "]", options);
  });
  
  describe('should pass', () => {
    beforeEach(()=> {
      cy.intercept('mytest.com**', {
        body: \`<html>
            <head></head>
          <body>
          <a href="#2" data-qa-id="link-2">My link</a>
          <a href="#3" data-qa-id="link-3">My link 3</a>
          </body>
          </html>
          \`
      });
      
      cy.visit('mytest.com');
    });
    
    it('should click when added during chain', () => {
      cy.qaId('link-2').doSyncCommand(() => {
        console.log('hello')
      }).click();
    });
    
    it('should succeed when added before should', () => {
      cy.qaId('link-60').doSyncCommand(()=> {
        console.log('hello')
      }).should('not.exist');
    });
    
    it('should succeed when cy commands inside', () => {
      cy.qaId('link-60').doSyncCommand((s)=> {
        cy.log('hello');
        cy.wrap(s);
      }).should('not.exist');
    });
    
    it('should succeed when between cy commands with cy commands inside', () => {
      cy.get('body').find('a').doSyncCommand((s)=> {
        cy.log('hello');
        cy.wrap(s, { log: false });
      }).eq(1).should('have.text', 'My link 3');
    });
    
   
  });
`,
    ],
    { allureWrapCustomCommands: 'true' },
  );

  describe('check results', () => {
    let resFixed: AllureTest[];

    it('should have results', () => {
      // should not fail run
      checkCyResults(res?.result?.res, {
        status: 'finished',
        totalPassed: 4,
        totalFailed: 0,
        totalPending: 0,
        totalSkipped: 0,
        totalSuites: 1,
        totalTests: 4,
      });
    });
    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('01 should click', () => {
      const tests = resFixed.filter(
        t => t.name === 'should click when added during chain',
      );
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name?.replace(/\d{3,8}/, 'number'),
        status: t.status,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'qaId: link-2',
          status: 'passed',
          steps: [
            {
              name: 'get: [data-qa-id=link-2]',
              status: 'passed',
              steps: [],
            },
          ],
        },
        {
          name: 'click',
          status: 'passed',
          steps: [
            {
              name: 'new url: http://localhost:number/mytest.com#2',
              status: 'passed',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('02 should not exist', () => {
      const tests = resFixed.filter(
        t => t.name === 'should succeed when added before should',
      );
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name?.replace(/\d{3,8}/, 'number'),
        status: t.status,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'qaId: link-60',
          status: 'passed',
          steps: [
            {
              name: 'get: [data-qa-id=link-60]',
              status: 'passed',
              steps: [
                {
                  name: 'assert: expected **[data-qa-id=link-60]** not to exist in the DOM',
                  status: 'passed',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('03 cy commands inside', () => {
      const tests = resFixed.filter(
        t => t.name === 'should succeed when cy commands inside',
      );
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name?.replace(/\d{3,8}/, 'number'),
        status: t.status,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'qaId: link-60',
          status: 'passed',
          steps: [
            {
              name: 'get: [data-qa-id=link-60]',
              status: 'passed',
              steps: [
                {
                  name: 'assert: expected **[data-qa-id=link-60]** not to exist in the DOM',
                  status: 'passed',
                  steps: [],
                },
              ],
            },
          ],
        },
        {
          name: 'log: hello',
          status: 'passed',
          steps: [],
        },
        {
          name: 'wrap',
          status: 'passed',
          steps: [],
        },
      ]);
    });

    it('04 cy commands inside between queries', () => {
      const tests = resFixed.filter(
        t =>
          t.name ===
          'should succeed when between cy commands with cy commands inside',
      );
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name?.replace(/\d{3,8}/, 'number'),
        status: t.status,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'get: body',
          status: 'passed',
          steps: [],
        },
        {
          name: 'find: a',
          status: 'passed',
          steps: [],
        },
        {
          name: 'log: hello',
          status: 'passed',
          steps: [],
        },
        {
          name: 'eq: 1',
          status: 'passed',
          steps: [
            {
              name: 'assert: expected **<a>** to have text **My link 3**',
              status: 'passed',
              steps: [],
            },
          ],
        },
      ]);
    });
  });
});
