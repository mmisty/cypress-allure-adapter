import {
  covergeAfterAllEvent,
  createResTest2,
  fixResult,
  mapSteps,
  whenCoverage,
  whenNoCoverage,
} from '../../../cy-helper/utils';
import { readFileSync } from 'fs';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';

describe('should have all hooks and steps inside', () => {
  const res = createResTest2(
    [
      `
before('Global Setup Pass', () => {
  console.log('Setup');
  cy.allure().startStep('global setup').endStep();
});

before('Global Setup', () => {
  console.log('Setup');
  cy.allure().startStep('global setup2');
  cy.wrap(null).then(() => {
    throw new Error('Failed Before ALL step');
  });
  cy.allure().endStep();
});

after('Global teardown', () => {
  cy.allure().step('global teardown');
  console.log('Tear down');
});

describe('hooks test - failed global hook step', () => {
  
  before('Global Setup in suite', () => {
    console.log('Setup');
    cy.allure().startStep('global setup').endStep();
  });
  
  it('test 1', () => {
    cy.log('test 1');
  });

  it('test 2', () => {
    cy.log('test 2');
  });

  describe('more tests', () => {
    it('test 3', () => {
      cy.log('test 2');
    });
  });
  
  afterEach(() => {
    cy.log('log after each');
  });

  afterEach('Named after', () => {
    cy.log('log after each');
  });

  after(() => {
    cy.log('after');
  });

  after('named hook all after', () => {
    cy.log('after');
  });
});
`,
    ],
    { allureAddVideoOnPass: 'true' },
  );

  it('should have correct events for one test', async () => {
    const testt = readFileSync(res.specs[0]);
    expect(
      testt
        .toString()
        .split('\n')
        .filter(t => t !== ''),
    ).toEqual([
      'mocha: start',
      'mocha: suite: , ',
      ...whenCoverage(
        'mocha: hook: "before all" hook',
        'cypress: test:before:run: test 1',
        'mocha: hook end: "before all" hook',
      ),
      'mocha: hook: "before all" hook: Global Setup Pass',
      ...whenNoCoverage('cypress: test:before:run: test 1'),
      'mocha: hook end: "before all" hook: Global Setup Pass',
      'mocha: hook: "before all" hook: Global Setup',
      'mocha: fail: "before all" hook: Global Setup for "test 1"',
      ...whenCoverage(...covergeAfterAllEvent),
      'mocha: hook: "after all" hook: Global teardown',
      'mocha: hook end: "after all" hook: Global teardown',
      'cypress: test:after:run: test 1',
      'plugin test:ended',
      'mocha: suite: hooks test - failed global hook step, hooks test - failed global hook step',
      'plugin test:started',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'plugin test:started',
      'plugin test:ended',
      'mocha: suite end: hooks test - failed global hook step',
      'mocha: suite end: ',
      'mocha: end',
    ]);
  });

  describe('check results', () => {
    let resFixed: AllureTest[];

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(3);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hooks test - failed global hook step more tests test 3',
        'hooks test - failed global hook step test 1',
        'hooks test - failed global hook step test 2',
      ]);
    });

    it('check attachments', async () => {
      expect(resFixed.map(t => t.attachments).sort()).toEqual([
        [
          {
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        [
          {
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        [
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
        [{ name: 'path', value: 'integration/e2e/temp/test_0_number.cy.ts' }],
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
        [
          {
            name: 'package',
            value: 'integration.e2e.temp.test_0_number.cy.ts',
          },
        ],
        [
          {
            name: 'package',
            value: 'integration.e2e.temp.test_0_number.cy.ts',
          },
        ],
      ]);
    });

    it('check first test befores', async () => {
      const parents = resFixed.map(t => getParentsArray(t));
      expect(parents[0].map(t => t.befores?.map(x => mapSteps(x.steps)))).toEqual([
        [
          ...whenCoverage([
            {
              name: 'Coverage: Reset [@cypress/code-coverage]',
              steps: [],
            },
          ]),
          [
            {
              name: 'global setup',
              steps: [],
            },
          ],
          [
            {
              name: 'global setup2',
              steps: [
                {
                  name: 'wrap: null',
                  steps: [],
                },
              ],
            },
          ],
        ],
      ]);
    });

    it('check second test befores', async () => {
      const parents = resFixed.map(t => getParentsArray(t));
      expect(parents[1].map(t => t.befores?.map(x => mapSteps(x.steps)))).toEqual([
        [
          ...whenCoverage([
            {
              name: 'Coverage: Reset [@cypress/code-coverage]',
              steps: [],
            },
          ]),
          [
            {
              name: 'global setup',
              steps: [],
            },
          ],
          [
            {
              name: 'global setup2',
              steps: [
                {
                  name: 'wrap: null',
                  steps: [],
                },
              ],
            },
          ],
        ],
      ]);
    });

    it('check first test afters', async () => {
      const parents = resFixed.map(t => getParentsArray(t));
      expect(parents[0].map(t => t.afters?.map(x => mapSteps(x.steps)))).toEqual([
        [
          ...whenCoverage(
            [],
            [
              {
                name: 'log: Saving code coverage for **unit** `[@cypress/code-coverage]`',
                steps: [],
              },
            ],
            [
              {
                name: 'Coverage: Generating report [@cypress/code-coverage]',
                steps: [],
              },
            ],
          ),
          [
            {
              name: 'global teardown',
              steps: [],
            },
          ],
        ],
      ]);
    });

    it('check tests parent steps', async () => {
      expect(resFixed.map(t => t.steps.map(s => s.name))).toEqual([[], [], []]);
    });
  });
});
