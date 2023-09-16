import {
  findHooksForCurrentSuite,
  findSiblings,
  printTreeWithIndents,
  SpecTree,
} from '../../../src/plugins/tree-utils';

describe('spec tree', () => {
  describe('siblings', () => {
    it('find siblings', () => {
      const root = new SpecTree();
      root.addHook('hook 1', {} as any);
      root.addHook('hook 2', {} as any);
      root.addSuite('suite 2', {} as any);
      root.addTest('test 1', {} as any);
      root.addTest('test 2', {} as any);

      const siblings = findSiblings(
        root.root,
        root.currentSuite,
        t => t.type === 'hook',
      );
      expect(siblings.map(t => t.data.name)).toEqual(['hook 1', 'hook 2']);
    });

    it('find siblings - all global hooks for suite', () => {
      const root = new SpecTree();
      root.addHook('hook 1', {} as any);
      root.addHook('hook 2', {} as any);
      root.addSuite('suite 1', {} as any);
      root.addHook('hook 3', {} as any);
      root.addSuite('suite 2', {} as any);
      root.addHook('hook 4', {} as any);
      root.addTest('test 1', {} as any);
      root.addTest('test 2', {} as any);

      expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
        'root',
        '--hook 1',
        '--hook 2',
        '--suite 1',
        '----hook 3',
        '----suite 2',
        '------hook 4',
        '------test 1',
        '------test 2',
      ]);

      expect(findHooksForCurrentSuite(root).map(t => t.data.name)).toEqual([
        'hook 1',
        'hook 2',
        'hook 3',
        'hook 4',
      ]);
    });

    it('find siblings - all global hooks for suite 2', () => {
      const root = new SpecTree();
      root.addHook('hook 1', {} as any);
      root.addHook('hook 2', {} as any);
      root.addSuite('suite 1', {} as any);
      root.addHook('hook 3', {} as any);
      root.addSuite('suite 2', {} as any);
      root.addTest('test 1', {} as any);
      root.addTest('test 2', {} as any);

      expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
        'root',
        '--hook 1',
        '--hook 2',
        '--suite 1',
        '----hook 3',
        '----suite 2',
        '------test 1',
        '------test 2',
      ]);

      expect(findHooksForCurrentSuite(root).map(t => t.data.name)).toEqual([
        'hook 1',
        'hook 2',
        'hook 3',
      ]);
    });

    it('find siblings - all global hooks for suite (several suites)', () => {
      const root = new SpecTree();
      root.addHook('hook 1', {} as any);
      root.addHook('hook 2', {} as any);
      root.addSuite('suite 1', {} as any);
      root.addHook('hook 3', {} as any);
      root.addSuite('suite 2', {} as any);
      root.addTest('test 1', {} as any);
      root.addTest('test 2', {} as any);
      root.endSuite();
      root.addSuite('suite 4', {} as any);
      root.addTest('test 3', {} as any);

      expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
        'root',
        '--hook 1',
        '--hook 2',
        '--suite 1',
        '----hook 3',
        '----suite 2',
        '------test 1',
        '------test 2',
        '----suite 4',
        '------test 3',
      ]);

      expect(findHooksForCurrentSuite(root).map(t => t.data.name)).toEqual([
        'hook 1',
        'hook 2',
        'hook 3',
      ]);
    });

    it('find siblings - all global hooks for suite (several suites - with hook)', () => {
      const root = new SpecTree();
      root.addHook('hook 1', {} as any);
      root.addHook('hook 2', {} as any);
      root.addSuite('suite 1', {} as any);
      root.addHook('hook 3', {} as any);
      root.addSuite('suite 2', {} as any);
      root.addTest('test 1', {} as any);
      root.addTest('test 2', {} as any);
      root.endSuite();
      root.addSuite('suite 4', {} as any);
      root.addHook('hook 4', {} as any);
      root.addTest('test 3', {} as any);

      expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
        'root',
        '--hook 1',
        '--hook 2',
        '--suite 1',
        '----hook 3',
        '----suite 2',
        '------test 1',
        '------test 2',
        '----suite 4',
        '------hook 4',
        '------test 3',
      ]);

      expect(findHooksForCurrentSuite(root).map(t => t.data.name)).toEqual([
        'hook 1',
        'hook 2',
        'hook 3',
        'hook 4',
      ]);
    });
  });
});
