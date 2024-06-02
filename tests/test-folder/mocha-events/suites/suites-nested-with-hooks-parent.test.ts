import { createResTest2, fixResult } from '../../../cy-helper/utils';
import { getParentsArray, parseAllure } from 'allure-js-parser';
import { extname } from '../../../../src/common';
import { readFileSync } from 'fs';

// https://github.com/mmisty/cypress-allure-adapter/issues/7
describe('several nested suites with global hook - hook should be added to all children', () => {
  const res = createResTest2([
    `
describe('hello suite', () => {
  before('parent hook', () => {
    cy.allure().attachment('out parent', 'test number', 'text/plain');
    cy.log('before');
  });
  
  describe('child suite', () => {
    before('child hook', () => {
      cy.allure().attachment('out child', 'test number', 'text/plain');
      cy.log('before');
    });
    
    describe('sub sub suite', () => {
      it('hello test', () => {
        cy.log('message');
      });
    });
    
    it('test2', () => {
      cy.log('message');
    });
  });
  
  it('test3', () => {
    cy.log('message');
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
      expect(resFixed.length).toEqual(1);
    });

    it('check tests names', async () => {
      expect(resFixed.map(t => t.fullName).sort()).toEqual([
        'hello suite child suite sub sub suite hello test',
      ]);
    });

    it('suites parents', () => {
      expect(
        resFixed.map(t => ({
          name: t.name,
          status: t.status,
          parents: getParentsArray(t).map(t => ({
            name: t.name,
            befores: t.befores
              ?.filter(x => (x as any).name !== '"before all" hook')
              .map(x => ({
                name: (x as any).name,
                status: x.status,
                attachments: x.attachments.map(t => ({
                  ...t,
                  source: `source${extname(t.source)}`,
                  sourceContentMoreThanZero:
                    readFileSync(`${res.watch}/${t.source}`).toString().length >
                    0,
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
                  attachments: [
                    {
                      name: 'out parent',
                      source: 'source.txt',
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
                      source: 'source.txt',
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
              befores: [
                {
                  attachments: [
                    {
                      name: 'out parent',
                      source: 'source.txt',
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
                      source: 'source.txt',
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
              befores: [
                {
                  attachments: [
                    {
                      name: 'out parent',
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