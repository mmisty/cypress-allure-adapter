import { checkCyResults, mapSteps } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { createCucumberTestRes } from '../../../cy-helper/cucumber-utils';

describe('cucumber test', () => {
  const res = createCucumberTestRes(
    [
      `
Feature: test cucumber
  Background:
    Given I visit site

  Scenario: 01 visiting the frontpage
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
      const test = results.find(t => t.name === '01 visiting the frontpage');
      expect(test).toBeDefined();
    });

    it('check steps of test', async () => {
      const test = results.find(t => t.name === '01 visiting the frontpage');

      const steps = mapSteps(test!.steps, t => ({
        name: t.name,
        status: t.status,
        duration: t.stop && t.start && t.stop - t.start > 0,
      })).filter(
        t =>
          t.name.indexOf('before each') === -1 &&
          t.name.indexOf('after each') === -1,
      );

      expect(steps).toEqual([
        {
          duration: true,
          name: 'Given : I visit site',
          status: 'passed',
          steps: [
            {
              duration: true,
              name: 'log: visit site',
              status: 'passed',
              steps: [],
            },
          ],
        },
        {
          duration: true,
          name: 'Then : I should see a search bar "hello"',
          status: 'passed',
          steps: [
            {
              duration: true,
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
