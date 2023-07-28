import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should have links by using cy.allure() interface', () => {
  const res = createResTest2(
    [
      `
  describe('set link from test', () => {
    it('link issue test', () => {
      cy.allure().link('http://example.com', 'example', 'issue');
    });
    
    it('link tms test', () => {
      cy.allure().link('http://example.com', 'example', 'tms');
    });
    
    it('tms test with link', () => {
      cy.allure().tms('http://example.com', 'example');
    });
    
    it('tms test with id', () => {
      cy.allure().tms('ABC-1', 'example');
    });
    
    it('tms test with id and no description', () => {
      cy.allure().tms('ABC-1');
    });
    
    it('issue test with id and no description', () => {
      cy.allure().issue('ABC-1');
    });
    
    it('issue test with id asterisk', {env: {issuePrefix:  'http://my.jira.com/*/browse/'}}, () => {
      cy.allure().issue('ABC-1');
    });
    
    it('issue test with no env', {env: {issuePrefix:  undefined}}, () => {
      cy.allure().issue('ABC-1');
    });
    it('tms test with no env', {env: {tmsPrefix:  undefined}}, () => {
      cy.allure().tms('ABC-1');
    });
    
  });
`,
    ],
    { tmsPrefix: undefined, issuePrefix: 'http://my.jira.com/' },
  );
  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('should have link issue', () => {
      const tests = resFixed.filter(t => t.name === 'link issue test');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([[{ name: 'example', type: 'issue', url: 'http://example.com' }]]);
    });

    it('should have link tms', () => {
      const tests = resFixed.filter(t => t.name === 'link tms test');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([[{ name: 'example', type: 'tms', url: 'http://example.com' }]]);
    });

    it('should have tms with link', () => {
      const tests = resFixed.filter(t => t.name === 'tms test with link');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([[{ name: 'example', type: 'tms', url: 'http://example.com' }]]);
    });

    it('should have tms with id', () => {
      const tests = resFixed.filter(t => t.name === 'tms test with id');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([[{ name: 'example', type: 'tms', url: 'http://jira/ABC-1' }]]);
    });

    it('should have tms with id and no desc', () => {
      const tests = resFixed.filter(t => t.name === 'tms test with id and no description');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([[{ type: 'tms', url: 'http://jira/ABC-1' }]]);
    });

    it('should have issue with id', () => {
      const tests = resFixed.filter(t => t.name === 'issue test with id and no description');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([[{ type: 'issue', url: 'http://my.jira.com/ABC-1' }]]);
    });

    it('should have issue with id asterisk', () => {
      const tests = resFixed.filter(t => t.name === 'issue test with id asterisk');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([[{ type: 'issue', url: 'http://my.jira.com/ABC-1/browse/' }]]);
    });

    it('should have issue with no env', () => {
      const tests = resFixed.filter(t => t.name === 'issue test with no env');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([[{ type: 'issue', url: 'ABC-1' }]]);
    });

    it('should have tms with no env', () => {
      const tests = resFixed.filter(t => t.name === 'tms test with no env');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([[{ type: 'tms', url: 'ABC-1' }]]);
    });
  });
});
