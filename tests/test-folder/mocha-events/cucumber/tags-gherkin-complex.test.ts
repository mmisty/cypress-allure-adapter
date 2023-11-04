import { checkCyResults } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';
import { createCucumberTestRes } from '../../../cy-helper/cucumber-utils';

describe('cucumber test to check labels', () => {
  const res = createCucumberTestRes(
    [
      `
@feature("Feature__name")
Feature: test cucumber
  Background:
    Given I visit site
  
  @epic("Story__name")
  @story("Epic__name")
  Scenario: 01 story/feature
    Then I should see a search bar "hello"
    
  @parentSuite("Parent__suite")
  @suite("Suite")
  @subSuite("my")
  @host("MAC")
  Scenario: 02 suites
    Then I should see a search bar "hello"
    
  @severity("minor")
  @owner("RP")
  @thread("01")
  @host("MAC")
  Scenario: 03 meta
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
      checkCyResults(res?.result?.res, { totalPassed: 3, totalFailed: 0 });
    });

    it('check labels of test feature story', async () => {
      const test = results.find(t => t.name === '01 story/feature');

      expect(
        test!.labels.filter(t => t.name !== 'package' && t.name !== 'path'),
      ).toEqual([
        {
          name: 'feature',
          value: 'Feature name',
        },
        {
          name: 'epic',
          value: 'Story name',
        },
        {
          name: 'story',
          value: 'Epic name',
        },
        {
          name: 'parentSuite',
          value: 'test cucumber',
        },
      ]);
    });

    it('check labels - suites', async () => {
      const test = results.find(t => t.name === '02 suites');

      expect(
        test!.labels.filter(t => t.name !== 'package' && t.name !== 'path'),
      ).toEqual([
        {
          name: 'feature',
          value: 'Feature name',
        },
        {
          name: 'host',
          value: 'MAC',
        },
        {
          name: 'parentSuite',
          value: 'Parent suite',
        },
        {
          name: 'suite',
          value: 'Suite',
        },
        {
          name: 'subSuite',
          value: 'my',
        },
      ]);
    });

    it('check labels of test meta', async () => {
      const test = results.find(t => t.name === '03 meta');

      expect(
        test!.labels.filter(t => t.name !== 'package' && t.name !== 'path'),
      ).toEqual([
        {
          name: 'feature',
          value: 'Feature name',
        },
        {
          name: 'severity',
          value: 'minor',
        },
        {
          name: 'owner',
          value: 'RP',
        },
        {
          name: 'thread',
          value: '01',
        },
        {
          name: 'host',
          value: 'MAC',
        },
        {
          name: 'parentSuite',
          value: 'test cucumber',
        },
      ]);
    });
  });
});
