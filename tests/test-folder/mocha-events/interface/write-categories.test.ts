import { createResTest2 } from '../../../cy-helper/utils';
import { existsSync, readFileSync } from 'fs';

describe('should be able to write env info and other', () => {
  const res = createResTest2(
    [
      `
  describe('write info from test', () => {
    before(() => {
     cy.allure().writeCategoriesDefinitions([
        {
          name: "failed message containing 123",
          description:"message containing 123 description",
          matchedStatuses: ["failed"],
          messageRegex: ".*123.*"
        },
        {
          name: "other",
          matchedStatuses: ["failed"],
          messageRegex: ".*\\\\d+.*",
          traceRegex: ".*",
        },
      ]);
    })
  
    it('01 throw exception', () => {
      cy.wrap(null).then(() => {
        throw new Error('message with 123 in it')
      });
    });
    
    it('02 throw exception other', () => {
      cy.wrap(null).then(() => {
        throw new Error('Special exception')
      });
    });
    
    it('02 pass', () => {
      cy.log('pass')
    });
    
  });
`,
    ],
    {},
  );
  describe('check results', () => {
    it('should be able to write categories info from test', () => {
      expect((res.result.res as any)?.totalFailed).toEqual(2);
      expect((res.result.res as any)?.totalPassed).toEqual(1);
      const file = `${res.watch}/categories.json`;
      expect(existsSync(file)).toEqual(true);

      const contents = readFileSync(file).toString();
      expect(JSON.parse(contents)).toEqual([
        {
          description: 'message containing 123 description',
          matchedStatuses: ['failed'],
          messageRegex: '.*123.*',
          name: 'failed message containing 123',
        },
        {
          matchedStatuses: ['failed'],
          messageRegex: '.*\\d+.*',
          name: 'other',
          traceRegex: '.*',
        },
      ]);
    });
  });
});
