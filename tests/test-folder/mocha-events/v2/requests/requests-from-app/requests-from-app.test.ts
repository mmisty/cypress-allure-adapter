import { expect } from 'expect';
import {
  getTest,
  mapSteps,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';

describe('requests from app - should not add to allure', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: {
        allureAddVideoOnPass: 'false',
        allureSkipSteps: '*\\[cypress-allure-adapter\\]*',
      },
    });
  });

  describe('01 should not add requests made by app', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '01 should not add requests');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have passed status', () => {
      expect(test?.status).toEqual('passed');
    });

    it('should have steps without request events from app', () => {
      const steps = mapSteps(
        test?.steps ?? [],
        t => ({
          status: t.status,
          name: t.name,
          attachments: t.attachments,
        }),
        t =>
          t.name?.indexOf('before each') === -1 &&
          t.name?.indexOf('after each') === -1,
      );

      expect(steps).toEqual([
        {
          status: 'passed',
          name: 'route',
          attachments: [],
          steps: [],
        },
        {
          status: 'passed',
          name: 'visit: mytest.com',
          attachments: [],
          steps: [],
        },
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
          steps: [],
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
          steps: [],
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
