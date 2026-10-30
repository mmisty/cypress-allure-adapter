import { createResTest2, mapSteps, readWithRetry } from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { extname } from '@src/common';

describe('should have requests when redirects', () => {
  const res = createResTest2(
    [
      `
  describe('suite', () => {
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

  it('01 redirects test', () => {
    cy.request({ url: '/api/test', failOnStatusCode: false });
  });
  
  it('02 its status', () => {
    cy.wrap({status:200}).its('status').should('eq', 200);
  });
 
});

`,
    ],
    { allureLogCyCommands: 'true' },
  );
  describe('check results', () => {
    let resAllure: AllureTest[];

    beforeAll(() => {
      resAllure = parseAllure(res.watch);
    });

    it('should have simple get request', () => {
      const tests = resAllure.filter(t => t.name === '01 redirects test');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps as any, t => ({
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
      })).filter(t => t.name.startsWith('request'));

      expect(steps).toEqual([
        {
          attach: [
            {
              name: 'requests',
              source: 'source.json',
              sourceContentMoreThanZero: true,
              type: 'application/json',
            },
          ],
          name: 'request: GET, /api/test',
          params: [
            {
              name: 'Response Status',
              value: '404',
            },
            {
              name: 'Request URL',
              value: 'http://localhost:number/api/test',
            },
            {
              name: 'Request Body',
              value: '',
            },
          ],
          status: 'broken',
          steps: [],
        },
      ]);
    });

    it('should have its status', () => {
      const tests = resAllure.filter(t => t.name === '02 its status');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps as any, t => ({
        status: t.status,
        name: t.name?.replace(/\d{4,}/g, 'number'),
        params: t.parameters,
        attach: t.attachments,
      }))
        .filter(t => t.name.indexOf('"after each"') === -1)
        .filter(t => t.name.indexOf('"before each"') === -1);

      expect(steps).toEqual([
        {
          attach: [],
          name: 'wrap: {status: 200}',
          params: [],
          status: 'passed',
          steps: [],
        },
        {
          attach: [],
          name: 'its: status',
          params: [],
          status: 'passed',
          steps: [
            {
              attach: [],
              name: 'assert: expected **200** to equal **200**',
              params: [],
              status: 'passed',
              steps: [],
            },
          ],
        },
      ]);
    });
  });
});
