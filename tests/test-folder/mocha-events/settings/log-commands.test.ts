import { createResTest2, mapSteps, readWithRetry } from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { extname } from '@src/common';

describe('should not log when allureLogCyCommands setting is false', () => {
  const res = createResTest2(
    [
      `
  describe('suite', { defaultCommandTimeout: 500 },() => {
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

  it('No logged commands', () => {
    cy.get('body a').should('exist');
  });
  
  it('only user commands', () => {
    cy.allure().startStep('check existing');
    cy.get('div').should('exist');
    cy.allure().endStep();
  });
  
 it('attach requests', () => {
    cy.request('/api/test');
  });
});

`,
    ],
    { allureLogCyCommands: 'false' },
  );
  describe('check results', () => {
    let resAllure: AllureTest[];

    beforeAll(() => {
      resAllure = parseAllure(res.watch);
    });

    it('should not log cy commands', () => {
      const tests = resAllure.filter(t => t.name === 'No logged commands');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        status: t.status,
        name: t.name?.replace(/\d{4,}/g, 'number'),
        params: t.parameters.map(t => ({
          ...t,
          value:
            t.name === 'Request URL'
              ? t.value?.replace(/\d{4,}/g, 'number')
              : t.value,
        })),
        attach: t.attachments.map(t => ({
          ...t,
          source: `source${extname(t.source)}`,
          sourceContentMoreThanZero:
            readWithRetry(`${res.watch}/${t.source}`).toString().length > 0,
        })),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([]);
    });

    it('should  log only user commands', () => {
      const tests = resAllure.filter(t => t.name === 'only user commands');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        status: t.status,
        name: t.name?.replace(/\d{4,}/g, 'number'),
        params: t.parameters.map(t => ({
          ...t,
          value:
            t.name === 'Request URL'
              ? t.value?.replace(/\d{4,}/g, 'number')
              : t.value,
        })),
        attach: t.attachments.map(t => ({
          ...t,
          source: `source${extname(t.source)}`,
          sourceContentMoreThanZero:
            readWithRetry(`${res.watch}/${t.source}`).toString().length > 0,
        })),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          attach: [],
          name: 'check existing',
          params: [],
          status: 'failed',
          steps: [],
        },
      ]);
    });

    it('should attach requests', () => {
      const tests = resAllure.filter(t => t.name === 'attach requests');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        status: t.status,
        name: t.name?.replace(/\d{4,}/g, 'number'),
        params: t.parameters.map(t => ({
          ...t,
          value:
            t.name === 'Request URL'
              ? t.value?.replace(/\d{4,}/g, 'number')
              : t.value,
        })),
        attach: t.attachments.map(t => ({
          ...t,
          source: `source${extname(t.source)}`,
          sourceContentMoreThanZero:
            readWithRetry(`${res.watch}/${t.source}`).toString().length > 0,
        })),
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          attach: [
            {
              name: 'Request Headers',
              source: 'source.json',
              sourceContentMoreThanZero: true,
              type: 'application/json',
            },
            {
              name: 'Response Headers',
              source: 'source.json',
              sourceContentMoreThanZero: true,
              type: 'application/json',
            },
          ],
          name: 'request: 302 api/test',
          params: [
            {
              name: 'Request URL',
              value: 'http://localhost:number/api/test',
            },
            {
              name: 'Request Body',
              value: '',
            },
            {
              name: 'Response Body',
              value: '',
            },
          ],
          status: 'broken',
          steps: [],
        },
        {
          attach: [
            {
              name: 'Request Headers',
              source: 'source.json',
              sourceContentMoreThanZero: true,
              type: 'application/json',
            },
            {
              name: 'Response Body',
              source: 'source.json',
              sourceContentMoreThanZero: true,
              type: 'application/json',
            },
            {
              name: 'Response Headers',
              source: 'source.json',
              sourceContentMoreThanZero: true,
              type: 'application/json',
            },
          ],
          name: 'request: 200 __/',
          params: [
            {
              name: 'Request URL',
              value: 'http://localhost:number/__/',
            },
            {
              name: 'Request Body',
              value: '',
            },
          ],
          status: 'passed',
          steps: [],
        },
      ]);
    });
  });
});
