import {
  checkCyResults,
  createResTest2,
  fixResult,
  mapSteps,
} from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { readFileSync } from 'fs';

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
      cy.tasklog1({long: {long: ['chicken', 'chicken', 'chicken', 'chicken', 'chicken', 'chicken', 'chicken', 'chicken' ]}});
    });
    
    it('just long log', () => {
      cy.log(JSON.stringify({long: {long: ['chicken', 'chicken', 'chicken', 'chicken', 'chicken', 'chicken', 'chicken', 'chicken' ]}}));
    });
  });
`,
    ],
    { allureWrapCustomCommands: 'true' },
  );

  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('checkCyResults', () => {
      checkCyResults(res.result.res, { totalPassed: 3 });
    });

    it('should not have attaches for short commands', () => {
      const tests = resFixed.filter(t => t.name === 'tasklog1');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        attach: t.attachments,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          attach: [],
          name: 'tasklog1: hello',
          steps: [
            {
              name: 'task: log, hello',
              attach: [],
              steps: [
                {
                  name: 'task: log, "hello"',
                  attach: [],
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('should have attaches for commands with long args', () => {
      const tests = resFixed.filter(t => t.name === 'tasklog1 long');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        attach: t.attachments.map(t => ({
          name: t.name,
          type: t.type,
          sourceContent: readFileSync(`${res.watch}/${t.source}`).toString(),
        })),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          attach: [
            {
              name: 'tasklog1 args',
              sourceContent:
                '{"long":{"long":["chicken","chicken","chicken","chicken","chicken","chicken","chicken","chicken"]}}',
              type: 'application/json',
            },
          ],
          name: 'tasklog1',
          steps: [
            {
              attach: [
                {
                  name: 'task: log args',
                  sourceContent:
                    'log\n{"long":{"long":["chicken","chicken","chicken","chicken","chicken","chicken","chicken","chicken"]}}',
                  type: 'application/json',
                },
              ],
              name: 'task: log',
              steps: [
                {
                  attach: [
                    {
                      name: 'task args',
                      sourceContent:
                        'log, {"long":{"long":["chicken","chicken","chicken","chicken","chicken","chicken","chicken","chicken"]}}',
                      type: 'application/json',
                    },
                  ],
                  name: 'task',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('should have attach for command log with long message', () => {
      const tests = resFixed.filter(t => t.name === 'just long log');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        attach: t.attachments.map(t => ({
          name: t.name,
          type: t.type,
          sourceContent: readFileSync(`${res.watch}/${t.source}`).toString(),
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
                '{"long":{"long":["chicken","chicken","chicken","chicken","chicken","chicken","chicken","chicken"]}}',
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
