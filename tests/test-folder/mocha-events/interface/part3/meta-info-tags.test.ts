import { createResTest2, fixResult } from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should have links by using tags meta info from test title', () => {
  const res = createResTest2(
    [
      `
  describe('set tms from test title', () => {
    it('link tms test @tms("ABC-123")', () => {
      // ignore
    });
    
    it('link tms test with description @tms("ABC-123","descrpt")', () => {
      // ignore
    });
    
    it('link tmsWithId test @tmsWithId("ABC-123","descrpt")', () => {
      // ignore
    });
    
    it('link issueWithId test @issueWithId("ABC-123","descrpt")', () => {
      // ignore
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

    it('should have tms issue', () => {
      const tests = resFixed.filter(t => t.name === 'link tms test');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([
        [{ name: 'ABC-123', type: 'tms', url: 'http://jira/ABC-123' }],
      ]);
    });

    it('should have tms issue with descrp', () => {
      const tests = resFixed.filter(
        t => t.name === 'link tms test with description',
      );
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([
        [{ name: 'descrpt', type: 'tms', url: 'http://jira/ABC-123' }],
      ]);
    });

    it('should have tmsWithId issue', () => {
      const tests = resFixed.filter(t => t.name === 'link tmsWithId test');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([
        [{ name: 'ABC-123: descrpt', type: 'tms', url: 'http://jira/ABC-123' }],
      ]);
    });

    it('should have issueWithId issue', () => {
      const tests = resFixed.filter(t => t.name === 'link issueWithId test');
      expect(tests.length).toEqual(1);

      const labels = tests.map(t => t.links).sort();
      expect(labels).toEqual([
        [
          {
            name: 'ABC-123: descrpt',
            type: 'issue',
            url: 'http://my.jira.com/ABC-123',
          },
        ],
      ]);
    });
  });
});
