import { expect } from 'expect';
import {
  mapSteps,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';

describe('request handler - add bodies to specific requests only', () => {
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

  describe('02 should add request bodies - POST - fetch (mirror - matching pattern)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = results.watchResults.find(
        t => t.name?.indexOf('02 should add request bodies') !== -1,
      );
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have passed status', () => {
      expect(test?.status).toEqual('passed');
    });

    it('should have proper steps with responseBody for mirror endpoint', () => {
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
              name: 'started:POST http://localhost:<port>/mirror',
              attachments: [],
              parameters: [],
              steps: [],
            },
            {
              status: 'passed',
              name: 'ended:POST http://localhost:<port>/mirror',
              attachments: [],
              parameters: [{ name: 'responseBody', value: '{}' }],
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

  describe('03 should add request bodies - POST - fetch (hello - not matching pattern)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = results.watchResults.find(
        t => t.name?.indexOf('03 should add request bodies') !== -1,
      );
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have passed status', () => {
      expect(test?.status).toEqual('passed');
    });

    it('should have proper steps WITHOUT responseBody for hello endpoint', () => {
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
              parameters: [],
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
