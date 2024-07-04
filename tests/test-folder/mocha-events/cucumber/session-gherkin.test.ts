import { checkCyResults, mapSteps } from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { createCucumberTestRes } from '../../../cy-helper/cucumber-utils';

describe('cucumber test to check groupping with session', () => {
  const res = createCucumberTestRes(
    [
      `
@Feature
Feature: test cucumber
  Background:
    Given I visit site
  
  @P1
  Scenario: 07 session
    Given I login with session
    Then I should see a search bar "hello"
`,
    ],
    [],
    { video: 'false' },
  );

  describe('check results', () => {
    let results: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
    });

    it('check cypress results', () => {
      checkCyResults(res?.result?.res, { totalPassed: 1, totalFailed: 0 });
    });

    it('check test with pass exists', async () => {
      const test = results.find(t => t.name === '07 session');
      expect(test).toBeDefined();
    });

    it('check steps of test', async () => {
      const test = results.find(t => t.name === '07 session');

      const steps = mapSteps(test!.steps, t => ({
        name: t.name,
        status: t.status,
      })).filter(
        t =>
          t.name.indexOf('before each') === -1 &&
          t.name.indexOf('after each') === -1,
      );

      expect(steps).toEqual([
        {
          name: 'Given : I visit site',
          status: 'passed',
          steps: [
            {
              name: 'log: visit site',
              status: 'passed',
              steps: [],
            },
          ],
        },
        {
          name: 'Given : I login with session',
          status: 'passed',
          steps: [
            {
              name: 'session: user',
              status: 'passed',
              steps: [
                {
                  name: 'Create new session',
                  status: 'passed',
                  steps: [
                    {
                      name: 'Clear page',
                      status: 'passed',
                      steps: [],
                    },
                    {
                      name: 'Clear cookies, localStorage and sessionStorage',
                      status: 'passed',
                      steps: [],
                    },
                    {
                      name: 'log: 1',
                      status: 'passed',
                      steps: [],
                    },
                    {
                      name: 'setCookie: A, AAA',
                      status: 'passed',
                      steps: [],
                    },
                  ],
                },
                {
                  name: 'Clear page',
                  status: 'passed',
                  steps: [],
                },
              ],
            },
          ],
        },
        {
          name: 'Then : I should see a search bar "hello"',
          status: 'passed',
          steps: [
            {
              name: 'log: hello',
              status: 'passed',
              steps: [],
            },
          ],
        },
      ]);
    });
  });
});
