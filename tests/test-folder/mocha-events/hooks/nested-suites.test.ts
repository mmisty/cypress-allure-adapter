import {
  covergeAfterAllEvent,
  createResTest2,
  eventsForFile,
  fixResult,
  fullStepAttachment,
  labelsForTest,
  whenCoverage,
  whenNoCoverage,
} from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { readFileSync } from 'fs';
import { basename } from 'path';

describe('nested suites', () => {
  const testsForRun = [
    { path: `${__dirname}/nested-suites-cy/nested-suite-before-fail-01.cy.ts` },
    { path: `${__dirname}/nested-suites-cy/nested-suite-before-pass-02.cy.ts` },
  ];

  const res = createResTest2(
    testsForRun.map(x => readFileSync(x.path).toString()),
    { allureAddVideoOnPass: 'true', DEBUG: 'true' },
  );

  describe(`Check results for ${basename(testsForRun[0].path)}`, () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch).filter(
        t => t.fullName?.indexOf('Suite01') !== -1,
      );
      resFixed = fixResult(results);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'Suite01 failure in nested suite before hook hooks test - child hooks test - sub child test 1',
        'Suite01 failure in nested suite before hook hooks test - child hooks test - sub child test 2',
        'Suite01 failure in nested suite before hook test 0',
      ]);
    });

    it('should have correct events for spec', async () => {
      const events = eventsForFile(res, basename(res.specs[0]));

      expect(events).toEqual([
        'mocha: start',
        'mocha: suite: , ',
        ...whenCoverage(
          'mocha: hook: "before all" hook',
          'cypress: test:before:run: test 0',
          'mocha: hook end: "before all" hook',
        ),
        'mocha: suite: Suite01 failure in nested suite before hook, Suite01 failure in nested suite before hook',
        'mocha: test: test 0',
        'plugin test:started',
        'mocha: hook: "before each" hook',
        'mocha: hook end: "before each" hook',
        'mocha: pass: test 0',
        'mocha: test end: test 0',
        'mocha: hook: "after each" hook',
        'mocha: hook end: "after each" hook',
        'cypress: test:after:run: test 0',
        'plugin test:ended',
        'mocha: suite: hooks test - child, Suite01 failure in nested suite before hook hooks test - child',
        'mocha: suite: hooks test - sub child, Suite01 failure in nested suite before hook hooks test - child hooks test - sub child',
        'mocha: hook: "before all" hook:  in suite',
        ...whenNoCoverage('cypress: test:before:run: test 1'),
        'cypress: test:before:run: test 1',
        'cypress:screenshot:test:Suite01 failure in nested suite before hook -- hooks test - child -- hooks test - sub child -- test 1 -- before all hook  in suite (failed).png',
        'mocha: fail: "before all" hook:  in suite for "test 1"',
        'mocha: suite end: hooks test - sub child',
        'mocha: suite end: hooks test - child',
        'mocha: suite end: Suite01 failure in nested suite before hook',

        ...whenCoverage(...covergeAfterAllEvent),
        'cypress: test:after:run: test 1',
        'plugin test:ended',
        'plugin test:started',
        'plugin test:ended',
        'plugin test:started',
        'plugin test:ended',
        'mocha: suite end: ',
        'mocha: end',
      ]);
    });

    it('check suite labels', async () => {
      expect(
        labelsForTest(resFixed, ['suite', 'parentSuite', 'subSuite']),
      ).toEqual([
        {
          name: 'test 0',
          labels: [
            {
              name: 'parentSuite',
              value: 'Suite01 failure in nested suite before hook',
            },
            //{ name: 'suite', value: 'hooks test - child' },
          ],
        },
        {
          name: 'test 1',
          labels: [
            {
              name: 'parentSuite',
              value: 'Suite01 failure in nested suite before hook',
            },
          ],
        },
        {
          name: 'test 2',
          labels: [
            {
              name: 'parentSuite',
              value: 'Suite01 failure in nested suite before hook',
            },
          ],
        },
      ]);
    });

    it('check test with screenshot', async () => {
      const obj = fullStepAttachment(resFixed, m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      obj[0].steps = obj[0].steps.filter(
        t =>
          t.name.indexOf('after each') === -1 &&
          t.name.indexOf('before each') === -1,
      );

      expect(obj).toEqual([
        {
          attachments: [],
          name: 'test 0',
          parents: [
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_0_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
              ],
              suiteName: 'Suite01 failure in nested suite before hook',
            },
          ],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'log: test 1',
              steps: [],
            },
          ],
        },
        {
          attachments: [],
          name: 'test 1',
          parents: [
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_0_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
              ],
              suiteName: 'Suite01 failure in nested suite before hook',
            },
          ],
          status: 'failed',
          steps: [],
        },
        {
          attachments: [],
          name: 'test 2',
          parents: [
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_0_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
              ],
              suiteName: 'Suite01 failure in nested suite before hook',
            },
          ],
          status: 'unknown',
          steps: [],
        },
      ]);
    });
  });

  describe(`Check results for ${basename(testsForRun[1].path)}`, () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch).filter(
        t => t.fullName?.indexOf('Suite02') !== -1,
      );
      resFixed = fixResult(results);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'Suite02 before hook passes in nested suite hooks test - child hooks test - sub child test 1',
        'Suite02 before hook passes in nested suite hooks test - child hooks test - sub child test 2',
        'Suite02 before hook passes in nested suite test 0',
      ]);
    });

    it('should have correct events for spec', async () => {
      const events = eventsForFile(res, basename(res.specs[0]));

      expect(events).toEqual([
        'mocha: start',
        'mocha: suite: , ',
        ...whenCoverage(
          'mocha: hook: "before all" hook',
          'cypress: test:before:run: test 0',
          'mocha: hook end: "before all" hook',
        ),
        'mocha: suite: Suite01 failure in nested suite before hook, Suite01 failure in nested suite before hook',
        'mocha: test: test 0',
        'plugin test:started',
        'mocha: hook: "before each" hook',
        'mocha: hook end: "before each" hook',
        'mocha: pass: test 0',
        'mocha: test end: test 0',
        'mocha: hook: "after each" hook',
        'mocha: hook end: "after each" hook',
        'cypress: test:after:run: test 0',
        'plugin test:ended',
        'mocha: suite: hooks test - child, Suite01 failure in nested suite before hook hooks test - child',
        'mocha: suite: hooks test - sub child, Suite01 failure in nested suite before hook hooks test - child hooks test - sub child',
        'mocha: hook: "before all" hook:  in suite',
        ...whenNoCoverage('cypress: test:before:run: test 1'),
        'cypress: test:before:run: test 1',
        'cypress:screenshot:test:Suite01 failure in nested suite before hook -- hooks test - child -- hooks test - sub child -- test 1 -- before all hook  in suite (failed).png',
        'mocha: fail: "before all" hook:  in suite for "test 1"',
        'mocha: suite end: hooks test - sub child',
        'mocha: suite end: hooks test - child',
        'mocha: suite end: Suite01 failure in nested suite before hook',

        ...whenCoverage(...covergeAfterAllEvent),
        'cypress: test:after:run: test 1',
        'plugin test:ended',
        'plugin test:started',
        'plugin test:ended',
        'plugin test:started',
        'plugin test:ended',
        'mocha: suite end: ',
        'mocha: end',
      ]);
    });

    it('check suite labels', async () => {
      expect(
        labelsForTest(resFixed, ['suite', 'parentSuite', 'subSuite']),
      ).toEqual([
        {
          name: 'test 0',
          labels: [
            {
              name: 'parentSuite',
              value: 'Suite02 before hook passes in nested suite',
            },
            //{ name: 'suite', value: 'hooks test - child' },
          ],
        },
        {
          name: 'test 1',
          labels: [
            {
              name: 'parentSuite',
              value: 'Suite02 before hook passes in nested suite',
            },
            { name: 'suite', value: 'hooks test - child' },
            { name: 'subSuite', value: 'hooks test - sub child' },
          ],
        },
        {
          name: 'test 2',
          labels: [
            {
              name: 'parentSuite',
              value: 'Suite02 before hook passes in nested suite',
            },
            {
              name: 'suite',
              value: 'hooks test - child',
            },
            {
              name: 'subSuite',
              value: 'hooks test - sub child',
            },
          ],
        },
      ]);
    });

    it('check test with screenshot', async () => {
      const obj = fullStepAttachment(resFixed, m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      obj[0].steps = obj[0].steps.filter(
        t =>
          t.name.indexOf('after each') === -1 &&
          t.name.indexOf('before each') === -1,
      );

      expect(obj).toEqual([
        {
          attachments: [],
          name: 'test 0',
          parents: [
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_1_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
              ],
              suiteName: 'Suite02 before hook passes in nested suite',
            },
          ],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'log: test 1',
              steps: [],
            },
          ],
        },
        {
          attachments: [],
          name: 'test 1',
          parents: [
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_1_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
                {
                  attachments: [],
                  name: '"before all" hook: in suite',
                  status: 'passed',
                  steps: [
                    {
                      attachments: [],
                      name: 'log: before',
                      steps: [],
                    },
                  ],
                },
              ],
              suiteName: 'hooks test - sub child',
            },
            {
              afters: [],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
              ],
              suiteName: 'hooks test - child',
            },
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_1_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
              ],
              suiteName: 'Suite02 before hook passes in nested suite',
            },
          ],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: '"before each" hook',
              steps: [],
            },
            {
              attachments: [],
              name: 'log: test 1',
              steps: [],
            },
            {
              attachments: [],
              name: '"after each" hook',
              steps: [
                {
                  attachments: [],
                  name: 'log: 👉 Only found unit test code coverage. `[@cypress/code-coverage]`',
                  steps: [],
                },
              ],
            },
          ],
        },
        {
          attachments: [],
          name: 'test 2',
          parents: [
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_1_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
                {
                  attachments: [],
                  name: '"before all" hook: in suite',
                  status: 'passed',
                  steps: [
                    {
                      attachments: [],
                      name: 'log: before',
                      steps: [],
                    },
                  ],
                },
              ],
              suiteName: 'hooks test - sub child',
            },
            {
              afters: [],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
              ],
              suiteName: 'hooks test - child',
            },
            {
              afters: [
                {
                  attachments: [
                    {
                      name: 'test_1_number.cy.ts.mp4',
                      source: 'source.mp4',
                      type: 'video/mp4',
                    },
                  ],
                  name: 'video',
                  status: 'passed',
                  steps: [],
                },
              ],
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook',
                  status: 'passed',
                  steps: [],
                },
              ],
              suiteName: 'Suite02 before hook passes in nested suite',
            },
          ],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: '"before each" hook',
              steps: [],
            },
            {
              attachments: [],
              name: 'log: test 2',
              steps: [],
            },
            {
              attachments: [],
              name: '"after each" hook',
              steps: [
                {
                  attachments: [],
                  name: 'log: 👉 Only found unit test code coverage. `[@cypress/code-coverage]`',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });
  });
});
