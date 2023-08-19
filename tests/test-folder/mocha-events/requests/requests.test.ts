import { createResTest2, mapSteps } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { extname } from '../../../../src/common';
import { readFileSync } from 'fs';

describe('should have requests', () => {
  const res = createResTest2(
    [
      `
  describe('suite', () => {
  let port = 3000;
  const url = () => 'http://localhost:' + port;

  before(() => {
    cy.task('shutDownTestServer');
    cy.task<number>('startTestServer').then(p => (port = p));
  });

  it('01 super simple GET without data', () => {
    cy.request(url());
  });
  
  it('01.2 simple GET without data', () => {
    cy.request('GET', url());
  });

  it('01.3 simple GET -  args as object', () => {
    cy.request({ url: url(), method: 'GET' });
  });

  it('02 simple POST with data', () => {
    cy.request('POST', url() + '/hello', { data: 'should' }).then(r => {
      cy.log('result:' + r.body.result);
      expect(r.body).deep.eq({ result: 'hello world' });
    });
  });

  it('02 POST without data', () => {
    cy.request('POST', url() + '/mirror');
  });

  it('02 POST with long data', () => {
    cy.request('POST', url() + '/mirror', {
      data: [{ chicken: 'Zina' }, { chicken: 'Marta' }, { chicken: 'Galya' }, { chicken: 'Zoya' }],
    });
  });
  
  it('02 simple GET -  args as object', () => {
     cy.request({ url:  url() + '/mirror', method: 'POST' }, {
      data: [{ chicken: 'Zina' }, { chicken: 'Marta' }, { chicken: 'Galya' }, { chicken: 'Zoya' }],
    });
  });
});

`,
    ],
    {},
  );
  describe('check results', () => {
    let resAllure: AllureTest[];

    beforeAll(() => {
      resAllure = parseAllure(res.watch);
    });

    it('should have simple get request', () => {
      const tests = resAllure.filter(t => t.name === '01 super simple GET without data');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name?.replace(/\d+/g, 'number'),
        params: t.parameters.map(t => ({
          ...t,
          value: t.name === 'Request URL' ? t.value?.replace(/\d+/g, 'number') : t.value,
        })),
        attach: t.attachments.map(t => ({
          ...t,
          source: `source${extname(t.source)}`,
          sourceContentMoreThanZero: readFileSync(`${res.watch}/${t.source}`).toString().length > 0,
        })),
      })).filter(t => t.name.startsWith('request'));

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
          name: 'request: http://localhost:number',
          params: [
            {
              name: 'Request URL',
              value: 'http://localhost:number/',
            },
            {
              name: 'Request Body',
              value: '',
            },
            {
              name: 'Response Body',
              value: 'Hello World!',
            },
          ],
          steps: [
            {
              attach: [],
              name: 'request: number http://localhost:number/',
              params: [],
              steps: [],
            },
          ],
        },
      ]);
    });

    it('should have simple get request without data', () => {
      const tests = resAllure.filter(t => t.name === '01.2 simple GET without data');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name?.replace(/\d+/g, 'number'),
        params: t.parameters.map(t => ({
          ...t,
          value: t.name === 'Request URL' ? t.value?.replace(/\d+/g, 'number') : t.value,
        })),
        attach: t.attachments.map(t => ({
          ...t,
          source: `source${extname(t.source)}`,
          sourceContentMoreThanZero: readFileSync(`${res.watch}/${t.source}`).toString().length > 0,
        })),
      })).filter(t => t.name.startsWith('request'));

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
          name: 'request: GET, http://localhost:number',
          params: [
            {
              name: 'Request URL',
              value: 'http://localhost:number/',
            },
            {
              name: 'Request Body',
              value: '',
            },
            {
              name: 'Response Body',
              value: 'Hello World!',
            },
          ],
          steps: [
            {
              attach: [],
              name: 'request: number http://localhost:number/',
              params: [],
              steps: [],
            },
          ],
        },
      ]);
    });

    it('should have simple POST with data', () => {
      const tests = resAllure.filter(t => t.name === '02 simple POST with data');
      expect(tests.length).toEqual(1);

      const steps = mapSteps(tests[0].steps, t => ({
        name: t.name?.replace(/\d+/g, 'number'),
        params: t.parameters.map(t => ({
          ...t,
          value: t.name === 'Request URL' ? t.value?.replace(/\d+/g, 'number') : t.value,
        })),
        attach: t.attachments.map(t => ({
          ...t,
          source: `source${extname(t.source)}`,
          sourceContentMoreThanZero: readFileSync(`${res.watch}/${t.source}`).toString().length > 0,
        })),
      })).filter(t => t.name.startsWith('request'));

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
          name: 'request: POST, http://localhost:number/hello, {"data":"should"}',
          params: [
            {
              name: 'Request URL',
              value: 'http://localhost:number/hello',
            },
            {
              name: 'Request Body',
              value: '{\n "data": "should"\n}',
            },
            {
              name: 'Response Body',
              value: '{\n "result": "hello world"\n}',
            },
          ],
          steps: [
            {
              attach: [],
              name: 'request: number http://localhost:number/hello',
              params: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });
});
