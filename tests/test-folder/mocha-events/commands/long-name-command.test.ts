import {
  checkCyResults,
  createResTest2,
  fixResult,
  mapSteps,
  readWithRetry,
} from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('custom commands', () => {
  const res = createResTest2(
    [
      `
  Cypress.Commands.add('tasklog1', (message: any) => {
    cy.task('log', JSON.stringify(message));
  });
  
  describe('should attach when long command name', () => {
    it('tasklog1', () => {
      cy.tasklog1('hello');
    });
    
     it('tasklog1 long', () => {
      cy.tasklog1("0123456789".repeat(21));
    });
    
    it('just long log', () => {
      cy.log("0123456789".repeat(21));
    });
  });
`,
    ],
    { allureWrapCustomCommands: 'true' },
  );

  describe('check results', () => {
    let resFixed: AllureTest[];
    let results: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('checkCyResults', () => {
      checkCyResults(res.result.res, { totalPassed: 3 });
    });

    it('should not have attaches for short commands', () => {
      const tests = resFixed.filter(t => t.name === 'tasklog1');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps as any, t => ({
        name: t.name,
        attach: t.attachments,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          attach: [],
          name: 'tasklog1: hello',
          steps: [],
        },
        {
          name: 'task: log, hello',
          attach: [],
          steps: [],
        },
      ]);
    });

    it('should have attaches for commands with long args', () => {
      const tests = results.filter(t => t.name === 'tasklog1 long');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps as any, t => ({
        name: t.name,
        attach: t.attachments.map(t => ({
          name: t.name,
          type: t.type,
          sourceContent: readWithRetry(`${res.watch}/${t.source}`).toString(),
        })),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'tasklog1',
          attach: [
            {
              name: 'tasklog1 args',
              sourceContent:
                '012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789',
              type: 'application/json',
            },
          ],
          steps: [],
        },
        {
          name: 'task: log',
          attach: [
            {
              name: 'task: log args',
              sourceContent:
                'log\n012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789',
              type: 'application/json',
            },
          ],
          steps: [],
        },
      ]);
    });

    it('should have attach for command log with long message', () => {
      const tests = results.filter(t => t.name === 'just long log');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps as any, t => ({
        name: t.name,
        attach: t.attachments.map(t => ({
          name: t.name,
          type: t.type,
          sourceContent: readWithRetry(`${res.watch}/${t.source}`).toString(),
        })),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          attach: [
            {
              name: 'log args',
              sourceContent:
                '012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789',
              type: 'application/json',
            },
          ],
          name: 'log',
          steps: [],
        },
      ]);
    });
  });
});
