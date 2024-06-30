import { createResTest2, readWithRetry } from '@test-utils';
import { existsSync, writeFileSync } from 'fs';

describe('should be able to write categories info and by file path', () => {
  beforeAll(() => {
    writeFileSync(
      'reports/categories.json',
      `[
      {
        "name": "failed message containing 123",
        "description": "message containing 123 description",
        "matchedStatuses": [ "failed" ],
        "messageRegex": ".*123.*"
      }
]`,
    );
  });

  const res = createResTest2(
    [
      `
  describe('write info from test', () => {
    it('03 categories file', () => {
      cy.allure().writeCategoriesDefinitions('reports/categories.json');
    });
  });
`,
    ],
    {},
  );
  describe('check results', () => {
    it('should be able to write categories by file', () => {
      expect((res.result.res as any)?.totalFailed).toEqual(0);
      expect((res.result.res as any)?.totalPassed).toEqual(1);
      const file = `${res.watch}/categories.json`;
      expect(existsSync(file)).toEqual(true);

      const contents = readWithRetry(file).toString();
      expect(JSON.parse(contents)).toEqual([
        {
          description: 'message containing 123 description',
          matchedStatuses: ['failed'],
          messageRegex: '.*123.*',
          name: 'failed message containing 123',
        },
      ]);
    });
  });
});
