import { expect } from 'expect';
import {
  getTest,
  mapSteps,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';

describe('request events - request:started and request:ended', () => {
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
      }),
      t => ['before each', 'after each'].every(x => t.name?.indexOf(x) === -1),
    );
  };

  describe('01 should register request events - fetch', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(
        results.watchResults,
        '01 should register request events - fetch',
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
          name: 'get: #toClickFetch',
          attachments: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#toClickFetch>** to exist in the DOM',
              attachments: [],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'click',
          attachments: [],
          steps: [
            {
              status: 'passed',
              name: 'started:GET http://localhost:<port>/',
              attachments: [],
              steps: [],
            },
            {
              status: 'passed',
              name: 'ended:GET http://localhost:<port>/',
              attachments: [],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'get: #result',
          attachments: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#result>** not to be **empty**',
              attachments: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });

  describe('02 should register request events - xhr', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(
        results.watchResults,
        '02 should register request events - xhr',
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
          name: 'get: #toClickXhr',
          attachments: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#toClickXhr>** to exist in the DOM',
              attachments: [],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'click',
          attachments: [],
          steps: [
            {
              status: 'passed',
              name: 'started:GET http://localhost:<port>/',
              attachments: [],
              steps: [],
            },
            {
              status: 'passed',
              name: 'ended:GET http://localhost:<port>/',
              attachments: [],
              steps: [],
            },
          ],
        },
        {
          status: 'passed',
          name: 'get: #result',
          attachments: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **<div#result>** not to be **empty**',
              attachments: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });
});
