import { createResTest2, fixResult } from '@test-utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('should have labels by using Cypress.Allure interface', () => {
  const res = createResTest2(
    [
      `
  describe('set label from test', () => {
    it('label test', () => {
      Cypress.Allure.label('THREAD', '01');
    });
     
    it('tag test', () => {
      Cypress.Allure.tag('@hello');
    });
    
    it('severity test', () => {
      Cypress.Allure.severity('normal');
    });
    
    it('language test', () => {
      Cypress.Allure.language('javas');
    });
    
    it('owner test', () => {
      Cypress.Allure.owner('TP');
    });
    
    it('os test', () => {
      Cypress.Allure.os('MACC');
    });
    
    it('host test', () => {
      Cypress.Allure.host('TP01');
    });
    
    it('layer test', () => {
      Cypress.Allure.layer('UI');
    });
    
    it('browser test', () => {
      Cypress.Allure.browser('CHROME');
    });
    
    it('device test', () => {
      Cypress.Allure.device('COMP');
    });
    
    it('lead test', () => {
      Cypress.Allure.lead('MAX');
    });
    
    it('feature test', () => {
      Cypress.Allure.feature('Ball');
    });
     
    it('story test', () => {
      Cypress.Allure.story('Net');
    });
    
    it('epic test', () => {
      Cypress.Allure.epic('ABC');
    });
    
    it('allureId test', () => {
      Cypress.Allure.allureId('123');
    });
    
    it('thread test', () => {
      Cypress.Allure.thread('02');
    });
  });
`,
    ],
    { allureAddVideoOnPass: 'true' },
  );
  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('should have label', () => {
      const tests = resFixed.filter(t => t.name === 'label test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'THREAD'));
      expect(labels).toEqual([[{ name: 'THREAD', value: '01' }]]);
    });

    it('should have tag', () => {
      const tests = resFixed.filter(t => t.name === 'tag test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'tag'));
      expect(labels).toEqual([[{ name: 'tag', value: '@hello' }]]);
    });

    it('should have severity', () => {
      const tests = resFixed.filter(t => t.name === 'severity test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'severity'));
      expect(labels).toEqual([[{ name: 'severity', value: 'normal' }]]);
    });

    it('should have language', () => {
      const tests = resFixed.filter(t => t.name === 'language test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'language'));
      expect(labels).toEqual([[{ name: 'language', value: 'javas' }]]);
    });

    it('should have owner', () => {
      const tests = resFixed.filter(t => t.name === 'owner test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'owner'));
      expect(labels).toEqual([[{ name: 'owner', value: 'TP' }]]);
    });

    it('should have os', () => {
      const tests = resFixed.filter(t => t.name === 'os test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'os'));
      expect(labels).toEqual([[{ name: 'os', value: 'MACC' }]]);
    });

    it('should have host', () => {
      const tests = resFixed.filter(t => t.name === 'host test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'host'));
      expect(labels).toEqual([[{ name: 'host', value: 'TP01' }]]);
    });

    it('should have layer', () => {
      const tests = resFixed.filter(t => t.name === 'layer test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'layer'));
      expect(labels).toEqual([[{ name: 'layer', value: 'UI' }]]);
    });

    it('should have browser', () => {
      const tests = resFixed.filter(t => t.name === 'browser test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'browser'));
      expect(labels).toEqual([[{ name: 'browser', value: 'CHROME' }]]);
    });

    it('should have device', () => {
      const tests = resFixed.filter(t => t.name === 'device test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'device'));
      expect(labels).toEqual([[{ name: 'device', value: 'COMP' }]]);
    });

    it('should have lead', () => {
      const tests = resFixed.filter(t => t.name === 'lead test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'lead'));
      expect(labels).toEqual([[{ name: 'lead', value: 'MAX' }]]);
    });

    it('should have feature', () => {
      const tests = resFixed.filter(t => t.name === 'feature test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'feature'));
      expect(labels).toEqual([[{ name: 'feature', value: 'Ball' }]]);
    });

    it('should have story', () => {
      const tests = resFixed.filter(t => t.name === 'story test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'story'));
      expect(labels).toEqual([[{ name: 'story', value: 'Net' }]]);
    });

    it('should have epic', () => {
      const tests = resFixed.filter(t => t.name === 'epic test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'epic'));
      expect(labels).toEqual([[{ name: 'epic', value: 'ABC' }]]);
    });

    it('should have allureId', () => {
      const tests = resFixed.filter(t => t.name === 'allureId test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'ALLURE_ID'));
      expect(labels).toEqual([[{ name: 'ALLURE_ID', value: '123' }]]);
    });

    it('should have thread', () => {
      const tests = resFixed.filter(t => t.name === 'thread test');
      expect(tests.length).toEqual(1);

      const labels = tests
        .map(t => t.labels)
        .sort()
        .map(t => t.filter(x => x.name === 'thread'));
      expect(labels).toEqual([[{ name: 'thread', value: '02' }]]);
    });
  });
});
