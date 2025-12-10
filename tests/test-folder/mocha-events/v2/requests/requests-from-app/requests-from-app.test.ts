import { expect } from 'expect';
import {
  getTest,
  mapSteps,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';

const rootSuite = 'requests-from-app';

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

  describe('mocha events order', () => {
    it('should have correct events order for spec', () => {
      const skipItems = [
        'collectBackendCoverage',
        'mergeUnitTestCoverage',
        'generateReport',
      ];

      const filteredEvents = results.events.filter(x =>
        skipItems.every(z => x.indexOf(z) === -1),
      );
      // todo when coverage
      expect(filteredEvents).toEqual([
        'mocha: start',
        'mocha: suite: , ',
        'mocha: hook: "before all" hook',
        'cypress: test:before:run: 01 should not add requests made by app',
        'mocha: hook end: "before all" hook',
        `mocha: suite: ${rootSuite}, ${rootSuite}`,
        'mocha: hook: "before all" hook',
        'mocha: hook end: "before all" hook',
        'mocha: test: 01 should not add requests made by app',
        'plugin test:started',
        'mocha: hook: "before each" hook: [cypress-allure-adapter]',
        'mocha: hook end: "before each" hook: [cypress-allure-adapter]',
        'mocha: hook: "before each" hook',
        'mocha: hook end: "before each" hook',
        'plugin request:started GET',
        'plugin request:started GET',
        'plugin request:ended GET',
        'plugin request:ended GET',
        'plugin request:started GET',
        'plugin request:ended GET',
        'mocha: pass: 01 should not add requests made by app',
        'mocha: test end: 01 should not add requests made by app',
        'mocha: hook: "after each" hook',
        'mocha: hook end: "after each" hook',
        `mocha: suite end: ${rootSuite}`,
        'cypress: test:after:run: 01 should not add requests made by app',
        'plugin test:ended',
        'mocha: suite end: ',
        'mocha: end',
      ]);
    });
  });
});
