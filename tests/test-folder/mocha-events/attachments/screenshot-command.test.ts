import {
  checkCyResults,
  createResTest2,
  mapSteps,
} from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { readFileSync } from 'fs';
import { extname } from '../../../../src/common';

describe('test screenshot event', () => {
  const res = createResTest2(
    [
      `
describe('test screenshot', () => {
  it('screenshot test', () => {
    cy.task('log', 'message');
    cy.screenshot('my-test');
  });
  
  it('screenshot test no name', () => {
    cy.task('log', 'message');
    cy.screenshot();
  });
});
`,
    ],
    { allureAddVideoOnPass: 'false', allureSkipCommands: 'screenshot' },
  );

  describe('check results', () => {
    let results: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
    });

    it('check cypress results', () => {
      checkCyResults(res?.result?.res, { totalPassed: 2 });
    });

    it('check test with screenshot', async () => {
      const test = results.find(t => t.name === 'screenshot test');
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const stepsAndTestAttach = {
        attach: test!.attachments.map(t => ({
          ...t,
          source: `source${extname(t.source)}`,
          length:
            readFileSync(`${res.watch}/${t.source}`).toString().length > 0,
        })),
        steps: mapSteps(test!.steps, t => ({
          name: t.name,
          attach: t.attachments,
        })).filter(
          t =>
            t.name.indexOf('before each') === -1 &&
            t.name.indexOf('after each') === -1,
        ),
      };

      expect(stepsAndTestAttach).toEqual({
        attach: [
          {
            length: true,
            name: 'my-test.png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
        steps: [
          {
            attach: [],
            name: 'task: log, message',
            steps: [],
          },
        ],
      });
    });

    it('check test screen no name long', async () => {
      const test = results.find(t => t.name === 'screenshot test no name');
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const resStepsAttach = {
        attach: test!.attachments.map(t => ({
          ...t,
          source: `source${extname(t.source)}`,
          length:
            readFileSync(`${res.watch}/${t.source}`).toString().length > 0,
        })),
        steps: mapSteps(test!.steps, t => ({
          name: t.name,
          attach: t.attachments,
        })).filter(
          t =>
            t.name.indexOf('before each') === -1 &&
            t.name.indexOf('after each') === -1,
        ),
      };
      expect(resStepsAttach).toEqual({
        attach: [
          {
            length: true,
            name: 'test screenshot -- screenshot test no name.png',
            source: 'source.png',
            type: 'image/png',
          },
        ],
        steps: [
          {
            name: 'task: log, message',
            steps: [],
            attach: [],
          },
        ],
      });
    });
  });
});
