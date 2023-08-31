import {
  checkCyResults,
  createResTest2,
  fixResult,
  mapSteps,
} from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('custom commands exclude', () => {
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
          <a href="#3" data-qa-id="link-3">My link</a>
          </body>
          </html>
          \`
      });
      
      cy.visit('mytest.com');
    });
    
    it('qaId simple', () => {
      cy.qaId('link-2').click();
    });
    
    it('qaId simple several', () => {
      cy.qaId('link-2').click();
      cy.qaId('link-3').click();
    });
  });
`,
    ],
    { allureWrapCustomCommands: '!qaId' },
  );

  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('should have nested steps for simple command that doesnt return chain', () => {
      const tests = resFixed.filter(t => t.name === 'qaId simple');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name?.replace(/\d{3,8}/, 'number'),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'qaId: link-2',
          steps: [],
        },
        {
          name: 'get: [data-qa-id=link-2]',
          steps: [],
        },
        {
          name: 'click',
          steps: [
            {
              name: 'new url: http://localhost:number/mytest.com#2',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('should have nested steps for several simple command that doesnt return chain', () => {
      const tests = resFixed.filter(t => t.name === 'qaId simple several');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name?.replace(/\d{3,8}/, 'number'),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'qaId: link-2',
          steps: [],
        },
        {
          name: 'get: [data-qa-id=link-2]',
          steps: [],
        },
        {
          name: 'click',
          steps: [
            {
              name: 'new url: http://localhost:number/mytest.com#2',
              steps: [],
            },
          ],
        },
        {
          name: 'qaId: link-3',
          steps: [],
        },
        {
          name: 'get: [data-qa-id=link-3]',
          steps: [],
        },
        {
          name: 'click',
          steps: [
            {
              name: 'new url: http://localhost:number/mytest.com#3',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('should have results', () => {
      // should not fail run
      checkCyResults(res?.result?.res, {
        totalPassed: 2,
        totalFailed: 0,
        totalPending: 0,
        totalSkipped: 0,
        totalSuites: 1,
        totalTests: 2,
      });
    });
  });
});
