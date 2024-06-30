import { checkCyResults } from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { createCucumberTestRes } from '../../../cy-helper/cucumber-utils';

describe('cucumber test to check labels', () => {
  const res = createCucumberTestRes(
    [
      `
@Feature
Feature: test cucumber
  Background:
    Given I visit site
  
  @P1
  @visit
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

    it('check labels of test', async () => {
      const test = results.find(t => t.name === '01 visiting the frontpage');

      expect(
        test!.labels.filter(t => t.name !== 'package' && t.name !== 'path'),
      ).toEqual([
        {
          name: 'tag',
          value: '@Feature',
        },
        {
          name: 'tag',
          value: '@P1',
        },
        {
          name: 'tag',
          value: '@visit',
        },
        {
          name: 'parentSuite',
          value: 'test cucumber',
        },
      ]);
    });
  });
});
