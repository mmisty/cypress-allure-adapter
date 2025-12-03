import { createResTest2, fixResult, readWithRetry } from '@test-utils';
import { getParentsArray, parseAllure } from 'allure-js-parser';
import { extname } from '@src/common';
import { AllureHook, Parent } from 'allure-js-parser/types';

// https://github.com/mmisty/cypress-allure-adapter/issues/7
describe('several nested suites with global hook - hook should be added to all children', () => {
  const res = createResTest2([
    `
describe('hello suite', () => {
  before('parent hook', () => {
    cy.allure().attachment('out parent', 'test number', 'text/plain');
    cy.log('before');
  });
  
  after('parent hook', () => {
    cy.log('before');
  });
  
  describe('child suite', () => {
    before('child hook', () => {
      cy.allure().attachment('out child', 'test number', 'text/plain');
      cy.log('before');
    });
    
    after('child hook', () => {
      cy.allure().attachment('out child', 'test number', 'text/plain');
      cy.log('before');
    });
    
    describe('sub sub suite', () => {
      it('hello test', () => {
        cy.log('message');
      });
    });
  });
});
`,
  ]);

  describe('check results', () => {
    let resFixed;
    let results;

    beforeAll(() => {
      results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(1);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite child suite sub sub suite hello test',
      ]);
    });

    it('suites parents', () => {
      expect(
        results.map(t => ({
          name: t.name,
          status: t.status,
          parents: getParentsArray(t).map((y: Parent) => ({
            name: y.name,
            befores: (y.befores as AllureHook[])
              ?.filter(x => x.name !== '"before all" hook')
              .map(x => ({
                name: (x as any).name,
                status: x.status,
                attachments: x.attachments.map(z => ({
                  ...z,
                  source: `source${extname(z.source)}`,
                  sourceContentMoreThanZero:
                    readWithRetry(`${res.watch}/${z.source}`)?.toString()
                      ?.length > 0,
                })),
              })),
            afters: (y.afters as AllureHook[])
              ?.filter(x => x.name !== '"after all" hook')
              ?.filter(x => x.name.indexOf('Coverage') === -1)
              ?.filter(x => x.name.indexOf('generateReport') === -1)
              ?.map(x => ({ status: x.status, name: (x as any).name })),
          })),
        })),
      ).toEqual([
        {
          name: 'hello test',
          parents: [
            {
              afters: [
                {
                  name: 'video',
                  status: 'passed',
                },
              ],
              befores: [
                {
                  attachments: [
                    {
                      name: 'out parent',
                      source: 'source.plain',
                      sourceContentMoreThanZero: true,
                      type: 'text/plain',
                    },
                  ],
                  name: '"before all" hook: parent hook',
                  status: 'passed',
                },
                {
                  attachments: [
                    {
                      name: 'out child',
                      source: 'source.plain',
                      sourceContentMoreThanZero: true,
                      type: 'text/plain',
                    },
                  ],
                  name: '"before all" hook: child hook',
                  status: 'passed',
                },
              ],
              name: 'sub sub suite',
            },
            {
              afters: [
                {
                  name: '"after all" hook: child hook',
                  status: 'passed',
                },
              ],
              befores: [
                {
                  attachments: [
                    {
                      name: 'out parent',
                      source: 'source.plain',
                      sourceContentMoreThanZero: true,
                      type: 'text/plain',
                    },
                  ],
                  name: '"before all" hook: parent hook',
                  status: 'passed',
                },
                {
                  attachments: [
                    {
                      name: 'out child',
                      source: 'source.plain',
                      sourceContentMoreThanZero: true,
                      type: 'text/plain',
                    },
                  ],
                  name: '"before all" hook: child hook',
                  status: 'passed',
                },
              ],
              name: 'child suite',
            },
            {
              afters: [
                {
                  name: '"after all" hook: parent hook',
                  status: 'passed',
                },
              ],
              befores: [
                {
                  attachments: [
                    {
                      name: 'out parent',
                      source: 'source.plain',
                      sourceContentMoreThanZero: true,
                      type: 'text/plain',
                    },
                  ],
                  name: '"before all" hook: parent hook',
                  status: 'passed',
                },
              ],
              name: 'hello suite',
            },
          ],
          status: 'passed',
        },
      ]);
    });
  });
});
