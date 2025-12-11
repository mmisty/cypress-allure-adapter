import { expect } from 'expect';
import {
  getTest,
  mapSteps,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';

describe('request handler - add bodies with additional interception', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'false' },
    });
  });

  const getSteps = (test: AllureTest | undefined) => {
    return mapSteps(
      test?.steps ?? [],
      t => ({
        status: t.status,
        name: t.name,
        attachments: t.attachments,
        parameters: t.parameters,
      }),
      t =>
        ['before each', 'after each', 'route', 'visit'].every(
          x => t.name?.indexOf(x) === -1,
        ),
    );
  };

  describe('01 should add request bodies - GET - fetch', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(
        results.watchResults,
        '01 should add request bodies - GET - fetch',
      );
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have passed status', () => {
      expect(test?.status).toEqual('passed');
    });

    it('should have proper steps with request events', () => {
      const steps = getSteps(test);

      expect(steps).toEqual([
        {
          status: 'passed',
          name: 'get: #element',
          attachments: [],
          parameters: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#element>** to exist in the DOM',
              attachments: [],
              parameters: [],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'click',
          attachments: [],
          parameters: [],
          steps: [
            {
              status: 'passed',
              name: 'started:GET http://localhost:<port>/',
              attachments: [],
              parameters: [],
              steps: [],
            },
            {
              status: 'passed',
              name: 'ended:GET http://localhost:<port>/',
              attachments: [],
              parameters: [{ name: 'responseBody', value: 'Hello World!' }],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'get: #result',
          attachments: [],
          parameters: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#result>** not to be **empty**',
              attachments: [],
              parameters: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });

  describe('02 should add request bodies - GET - xhr', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(
        results.watchResults,
        '02 should add request bodies - GET - xhr',
      );
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have passed status', () => {
      expect(test?.status).toEqual('passed');
    });

    it('should have proper steps with request events', () => {
      const steps = getSteps(test);

      expect(steps).toEqual([
        {
          status: 'passed',
          name: 'get: #element',
          attachments: [],
          parameters: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#element>** to exist in the DOM',
              attachments: [],
              parameters: [],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'click',
          attachments: [],
          parameters: [],
          steps: [
            {
              status: 'passed',
              name: 'started:GET http://localhost:<port>/',
              attachments: [],
              parameters: [],
              steps: [],
            },
            {
              status: 'passed',
              name: 'ended:GET http://localhost:<port>/',
              attachments: [],
              parameters: [{ name: 'responseBody', value: '' }],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'get: #result',
          attachments: [],
          parameters: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#result>** not to be **empty**',
              attachments: [],
              parameters: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });

  describe('03 should add request bodies - POST - fetch', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(
        results.watchResults,
        '03 should add request bodies - POST - fetch',
      );
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have passed status', () => {
      expect(test?.status).toEqual('passed');
    });

    it('should have proper steps with request events', () => {
      const steps = getSteps(test);

      expect(steps).toEqual([
        {
          status: 'passed',
          name: 'get: #element',
          attachments: [],
          parameters: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#element>** to exist in the DOM',
              attachments: [],
              parameters: [],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'click',
          attachments: [],
          parameters: [],
          steps: [
            {
              status: 'passed',
              name: 'started:POST http://localhost:<port>/hello',
              attachments: [],
              parameters: [],
              steps: [],
            },
            {
              status: 'passed',
              name: 'ended:POST http://localhost:<port>/hello',
              attachments: [],
              parameters: [
                { name: 'responseBody', value: '{"result":"hello world"}' },
              ],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'get: #result',
          attachments: [],
          parameters: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#result>** not to be **empty**',
              attachments: [],
              parameters: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });
});
