import {
  coverageAfterEachEvent,
  coverageBeforeEachEvent,
  covergeAfterAll,
  covergeAfterAllEvent,
  covergeBeforeAll,
  createResTest2,
  fixResult,
  whenCoverage,
  whenNoCoverage,
} from '../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { getParentsArray, parseAllure } from 'allure-js-parser';

describe('plugin events', () => {
  const res = createResTest2([
    `
describe('hello suite', () => {
  Cypress.Allure.on('test:started', () => {
    Cypress.Allure.step('step right after start');
  });
  
  Cypress.Allure.on('test:ended', () => {
    Cypress.Allure.step('step right before test end');
  });
  
  it('hello test', () => {
    cy.wrap(null).then(() => {
        throw new Error('Test FAIL on purpose');
    });
  });
});
`,
  ]);

  it('should have correct events for one test failed', async () => {
    const testt = readFileSync(res.specs[0]);
    expect(
      testt
        .toString()
        .split('\n')
        .filter(t => t !== ''),
    ).toEqual([
      'mocha: start',
      'mocha: suite: , ',
      ...whenCoverage('mocha: hook: "before all" hook'),
      ...whenCoverage('cypress: test:before:run: hello test'),
      ...whenCoverage('mocha: hook end: "before all" hook'),
      'mocha: suite: hello suite, hello suite',
      'mocha: test: hello test',
      'plugin test:started',
      ...whenCoverage(...coverageBeforeEachEvent),
      ...whenNoCoverage('cypress: test:before:run: hello test'),
      'cypress:screenshot:hello suite -- hello test (failed).png',
      'mocha: fail: hello test',
      'mocha: test end: hello test',
      ...whenCoverage(...coverageAfterEachEvent),
      'mocha: suite end: hello suite',
      ...whenCoverage(...covergeAfterAllEvent),
      'cypress: test:after:run: hello test',
      'plugin test:ended',
      'mocha: suite end: ',
      'mocha: end',
    ]);
  });

  describe('check results', () => {
    let resFixed;

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(1);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite hello test',
      ]);
    });

    it('check tests parents', async () => {
      expect(resFixed.map(t => getParentsArray(t))).toEqual([
        [
          {
            afters: [...whenCoverage(...covergeAfterAll)],
            befores: [...whenCoverage(...covergeBeforeAll)],
            name: 'hello suite',
            uuid: 'no',
          },
        ],
      ]);
    });

    it('check tests parent steps', async () => {
      expect(resFixed.map(t => t.steps.map(s => s.name))).toEqual([
        [
          'step right after start',
          ...whenCoverage('"before each" hook'),
          'wrap',
          ...whenCoverage('"after each" hook'),
          'step right before test end',
        ],
      ]);
    });

    it('check attachments', async () => {
      expect(resFixed.map(t => t.attachments).sort()).toEqual([
        [
          {
            name: 'hello suite -- hello test (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          // fails with
          // {
          //   name: 'hello suite -- hello test (failed).png',
          //   source: 'source.png',
          //   type: 'image/png',
          // },
          {
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
      ]);
    });

    it('check path label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'path')),
      ).toEqual([
        [{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }],
      ]);
    });

    it('check package label', async () => {
      expect(
        resFixed
          .map(t => t.labels)
          .sort()
          .map(t => t.filter(x => x.name === 'package')),
      ).toEqual([
        [
          {
            name: 'package',
            value: 'integration.e2e.temp.test_0_number.cy.ts',
          },
        ],
      ]);
    });
  });
});
