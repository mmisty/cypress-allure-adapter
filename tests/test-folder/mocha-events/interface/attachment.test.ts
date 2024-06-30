import { createResTest2, fixResult, mapSteps } from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { extname } from '../../../../lib/common';

describe('should have attachments by using cy.allure() interface', () => {
  const res = createResTest2(
    [
      `
  describe('set attachment from test', () => {
    it('01 attachment for step', () => {
      cy.allure().startStep('init');
      cy.allure().attachment('Letter1.json', 'A', 'text/plain');
      cy.allure().endStep();
    });
    
    it('01.1 fileAttachment for step', () => {
      cy.allure().startStep('init');
      cy.allure().fileAttachment('Letter1.json', '${__filename}', 'text/plain');
      cy.allure().endStep();
    });
    
    it('02 attachment no step', () => {
      cy.allure().attachment('Letter1.json', 'A', 'text/plain');
    });
  
    it('03 attachment for test when step started', () => {
      cy.allure().startStep('init');
      cy.allure().testAttachment('Letter1.json', 'A', 'text/plain');
      cy.allure().endStep();
    });
    
    it('03.1 fileAttachment for test when step started', () => {
      cy.allure().startStep('init');
      cy.allure().testFileAttachment('Letter1.json', '${__filename}', 'text/plain');
      cy.allure().endStep();
    });
  });
`,
    ],
    { allureAddVideoOnPass: 'false' },
  );
  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('should have step attachment', () => {
      const tests = resFixed.filter(t => t.name === '01 attachment for step');
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.attachments).sort();
      expect(parameters).toEqual([[]]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        attach: t.attachments.map(k => ({
          ...k,
          source: `source${extname(k.source)}`,
        })),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'init',
          attach: [
            {
              name: 'Letter1.json',
              source: 'source.txt',
              type: 'text/plain',
            },
          ],
          steps: [],
        },
      ]);
    });

    it('should have step fileAttachment', () => {
      const tests = resFixed.filter(
        t => t.name === '01.1 fileAttachment for step',
      );
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.attachments).sort();
      expect(parameters).toEqual([[]]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        attach: t.attachments.map(k => ({
          ...k,
          source: `source${extname(k.source)}`,
        })),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          name: 'init',
          attach: [
            {
              name: 'Letter1.json',
              source: 'source.ts',
              type: 'text/plain',
            },
          ],
          steps: [],
        },
      ]);
    });

    it('should have test attachments when no step', () => {
      const tests = resFixed.filter(t => t.name === '02 attachment no step');
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.attachments).sort();
      expect(parameters).toEqual([
        [
          {
            name: 'Letter1.json',
            source: 'source.txt',
            type: 'text/plain',
          },
        ],
      ]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        attach: t.attachments,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([]);
    });

    it('should have testAttachments when step started', () => {
      const tests = resFixed.filter(
        t => t.name === '03 attachment for test when step started',
      );
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.attachments).sort();
      expect(parameters).toEqual([
        [
          {
            name: 'Letter1.json',
            source: 'source.txt',
            type: 'text/plain',
          },
        ],
      ]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        attach: t.attachments,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          attach: [],
          name: 'init',
          steps: [],
        },
      ]);
    });
    it('should have testFileAttachments when step started', () => {
      const tests = resFixed.filter(
        t => t.name === '03.1 fileAttachment for test when step started',
      );
      expect(tests.length).toEqual(1);

      const parameters = tests.map(t => t.attachments).sort();
      expect(parameters).toEqual([
        [
          {
            name: 'Letter1.json',
            source: 'source.ts',
            type: 'text/plain',
          },
        ],
      ]);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name,
        attach: t.attachments,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          attach: [],
          name: 'init',
          steps: [],
        },
      ]);
    });
  });
});
