import { SpecTree } from '../../../src/plugins/tree-utils';

describe('spec tree', () => {
  describe('test data', () => {
    it('should add labels', () => {
      const root = new SpecTree();
      root.addTest('test', { labels: [] } as any);
      root.currentTestData?.labels?.push({ name: 'lb', value: 's' });

      expect(root.currentTestData).toEqual({
        labels: [{ name: 'lb', value: 's' }],
      });
    });
  });
});
