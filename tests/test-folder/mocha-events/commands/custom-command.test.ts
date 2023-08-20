import {
  checkCyResults,
  createResTest2,
  fixResult,
  mapSteps,
} from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('custom commands', () => {
  const res = createResTest2(
    [
      `
  Cypress.Commands.add('tasklog', (message: string) => {
    cy.task('log', message);
  });
  
  Cypress.Commands.add('tasklogWithCypressLog', (message: string) => {
    Cypress.log({ name: 'tasklogWithCypressLog', message: 'something' });
    cy.task('log', message);
  });
  
  Cypress.Commands.add('returnGet', { prevSubject: true }, (subj, message: string) => {
    cy.task('log', message);
  
    return cy.wrap(subj).get('div:eq(100)');
  });
  
  Cypress.Commands.add('returnTaskValue', (filePath: string) => {
    cy.wait(1);
    cy.wait(2);
  
    return cy.task('fileExists', filePath);
  });
  
  Cypress.Commands.add('nestedCommand', (filePath: string) => {
    return cy.returnTaskValue(filePath);
  });
  
  Cypress.Commands.add('specialIgnoredCommand', (filePath: string) => {
    return cy.nestedCommand(filePath);
  });
  
  describe('should pass', () => {
    it('tasklog', () => {
      cy.tasklog('hello');
      cy.get('div').should('exist');
    });
    
    it('tasklogWithCypressLog', () => {
      cy.tasklogWithCypressLog('hello');
      cy.get('div').should('exist');
    });
    
    it('returnGet', () => {
      cy.tasklog('hello').returnGet('hello').should('not.exist');
      cy.get('div').should('exist');
    });
    
    it('returnTaskValue', () => {
      cy.returnTaskValue('nonexistingd').should('eq', false);
    });
    
    it('nestedCommand', () => {
      cy.nestedCommand('nonexistingd2').should('eq', false);
    });
    
    it('not log command', () => {
      cy.get('div', { log: false }).should('exist');
    });
    
    it('ignore custom command', () => {
      cy.specialIgnoredCommand('nonexistingd2');
    });
  });
`,
    ],
    {
      allureWrapCustomCommands: 'true',
      allureSkipCommands: 'specialIgnoredCommand',
    },
  );

  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('should have nested steps for custom command', () => {
      const tests = resFixed.filter(t => t.name === 'tasklog');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({ name: t.name }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'tasklog: hello',
          steps: [{ name: 'task: log, hello', steps: [] }],
        },
        {
          name: 'get: div',
          steps: [
            {
              name: 'assert: expected **<div.inner-container>** to exist in the DOM',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('should have nested steps for custom command with LOG', () => {
      const tests = resFixed.filter(t => t.name === 'tasklogWithCypressLog');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({ name: t.name }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'tasklogWithCypressLog: hello',
          steps: [
            { name: 'tasklogWithCypressLog: something', steps: [] },
            { name: 'task: log, hello', steps: [] },
          ],
        },
        {
          name: 'get: div',
          steps: [
            {
              name: 'assert: expected **<div.inner-container>** to exist in the DOM',
              steps: [],
            },
          ],
        },
      ]);
    });
    it('should have nested steps for custom command which returns something', () => {
      const tests = resFixed.filter(t => t.name === 'returnGet');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({ name: t.name }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'tasklog: hello',
          steps: [{ name: 'task: log, hello', steps: [] }],
        },
        {
          name: 'returnGet: hello',
          steps: [
            { name: 'task: log, hello', steps: [] },
            { name: 'wrap', steps: [] },
            {
              name: 'get: div:eq(100)',
              steps: [
                {
                  name: 'assert: expected **div:eq(100)** not to exist in the DOM',
                  steps: [],
                },
              ],
            },
          ],
        },
        {
          name: 'get: div',
          steps: [
            {
              name: 'assert: expected **<div.inner-container>** to exist in the DOM',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('should have nested steps for custom command which returns value', () => {
      const tests = resFixed.filter(t => t.name === 'returnTaskValue');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({ name: t.name }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'returnTaskValue: nonexistingd',
          steps: [
            { name: 'wait: 1', steps: [] },
            { name: 'wait: 2', steps: [] },
            { name: 'task: fileExists, nonexistingd', steps: [] },
            {
              name: 'assert: expected **false** to equal **false**',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('should have nested steps for custom command with other commands', () => {
      const tests = resFixed.filter(t => t.name === 'nestedCommand');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({ name: t.name }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'nestedCommand: nonexistingd2',
          steps: [
            {
              name: 'returnTaskValue: nonexistingd2',
              steps: [
                { name: 'wait: 1', steps: [] },
                { name: 'wait: 2', steps: [] },
                { name: 'task: fileExists, nonexistingd2', steps: [] },
                {
                  name: 'assert: expected **false** to equal **false**',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('should have not have steps with log false', () => {
      const tests = resFixed.filter(t => t.name === 'not log command');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({ name: t.name }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'assert: expected **<div.inner-container>** to exist in the DOM',
          steps: [],
        },
      ]);
    });

    it('should ignore custom command skipped with allureSkipCommands', () => {
      const tests = resFixed.filter(t => t.name === 'ignore custom command');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({ name: t.name }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'nestedCommand: nonexistingd2',
          steps: [
            {
              name: 'returnTaskValue: nonexistingd2',
              steps: [
                { name: 'wait: 1', steps: [] },
                { name: 'wait: 2', steps: [] },
                { name: 'task: fileExists, nonexistingd2', steps: [] },
              ],
            },
          ],
        },
      ]);
    });

    it('should have results', () => {
      // should not fail run
      checkCyResults(res?.result?.res, {
        status: 'finished',
        totalPassed: 7,
        totalFailed: 0,
        totalPending: 0,
        totalSkipped: 0,
        totalSuites: 1,
        totalTests: 7,
      });
    });
  });
});
