import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { getParentsArray, parseAllure } from 'allure-js-parser';
import { extname } from '../../../../src/common';
import { readFileSync } from 'fs';

// issue https://github.com/mmisty/cypress-allure-adapter/issues/95
describe('several nested suites with global hook - hook should be added to all children', () => {
  const res = createResTest2([
    `
before('glob hook', () => {
  cy.log('before');
});

describe('hello suite', () => {
  before('parent hook', () => {
    cy.allure().attachment('out', 'test number', 'text/plain');
    cy.log('before');
  });
  
  it('test 1', () => {
    cy.log('message');
  });
  
  describe('child suite', () => {
    before('child hook', () => {
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

    beforeAll(() => {
      const results = parseAllure(res.watch);
      resFixed = fixResult(results);
    });

    it('check tests count', async () => {
      expect(resFixed.length).toEqual(2);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite child suite sub sub suite hello test',
        'hello suite test 1',
      ]);
    });

    it('suites parents', () => {
      expect(
        resFixed
          .sort((a, b) => (a.name < b.name ? -1 : 1))
          .map(t => ({
            name: t.name,
            status: t.status,
            parents: getParentsArray(t).map(t => ({
              name: t.name,
              befores: t.befores
                ?.filter(x => (x as any).name !== '"before all" hook')
                .map(x => ({
                  name: (x as any).name,
                  status: x.status,
                  statusDetails: x.statusDetails,
                  attachments: x.attachments.map(t => ({
                    ...t,
                    source: `source${extname(t.source)}`,
                    sourceContentMoreThanZero:
                      readFileSync(`${res.watch}/${t.source}`).toString()
                        .length > 0,
                  })),
                })),
            })),
          })),
      ).toEqual([
        {
          name: 'hello test',
          parents: [
            {
              befores: [
                {
                  name: '"before all" hook: glob hook',
                  status: 'passed',
                  attachments: [],
                },
                {
                  attachments: [
                    {
                      name: 'out',
                      source: 'source.txt',
                      sourceContentMoreThanZero: true,
                      type: 'text/plain',
                    },
                  ],
                  name: '"before all" hook: parent hook',
                  status: 'passed',
                },
                {
                  attachments: [],
                  name: '"before all" hook: child hook',
                  status: 'passed',
                },
              ],
              name: 'sub sub suite',
            },
            {
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook: glob hook',
                  status: 'passed',
                  statusDetails: {},
                },
                {
                  attachments: [
                    {
                      name: 'out',
                      source: 'source.txt',
                      sourceContentMoreThanZero: true,
                      type: 'text/plain',
                    },
                  ],
                  name: '"before all" hook: parent hook',
                  status: 'passed',
                  statusDetails: {},
                },
                {
                  attachments: [],
                  name: '"before all" hook: child hook',
                  status: 'passed',
                  statusDetails: {},
                },
              ],
              name: 'child suite',
            },
            {
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook: glob hook',
                  status: 'passed',
                  statusDetails: {},
                },
                {
                  attachments: [
                    {
                      name: 'out',
                      source: 'source.txt',
                      sourceContentMoreThanZero: true,
                      type: 'text/plain',
                    },
                  ],
                  name: '"before all" hook: parent hook',
                  status: 'passed',
                  statusDetails: {},
                },
              ],
              name: 'hello suite',
            },
          ],
          status: 'passed',
        },
        {
          name: 'test 1',
          parents: [
            {
              befores: [
                {
                  attachments: [],
                  name: '"before all" hook: glob hook',
                  status: 'passed',
                },
                {
                  attachments: [
                    {
                      name: 'out',
                      source: 'source.txt',
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
