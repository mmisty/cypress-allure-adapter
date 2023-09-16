import {
  getAllParents,
  isType,
  SpecTree,
} from '../../../src/plugins/tree-utils';

describe('spec tree', () => {
  it('getAll Parents - one suite', () => {
    const root = new SpecTree();

    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);
    root.endTest();

    expect(
      getAllParents(root.root, root.currentSuite, isType('suite')).map(
        t => t.data.name,
      ),
    ).toEqual(['parent']);
  });

  it('getAll Parents - no suite', () => {
    const root = new SpecTree();

    root.addTest('test 1', {} as any);
    root.endTest();

    expect(
      getAllParents(root.root, root.currentSuite, isType('suite')).map(
        t => t.data.name,
      ),
    ).toEqual([]);
  });

  it('getAll Parents', () => {
    const root = new SpecTree();

    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);
    root.endTest();

    root.addSuite('child', {} as any);
    root.addTest('test 2', {} as any);
    root.endTest();

    root.addSuite('sub', {} as any);
    root.addTest('test 3', {} as any);
    root.endTest();
    expect(
      getAllParents(root.root, root.currentSuite, isType('suite')).map(
        t => t.data.name,
      ),
    ).toEqual(['parent', 'child', 'sub']);
  });

  it('getAll Parents more2', () => {
    const root = new SpecTree();

    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);
    root.endTest();

    root.addSuite('child', {} as any);
    root.addTest('test 2', {} as any);
    root.endTest();

    root.addSuite('sub', {} as any);
    root.addTest('test 3', {} as any);
    root.endTest();

    root.addSuite('sub 2', {} as any);
    root.addTest('test 4', {} as any);
    root.endTest();

    root.addSuite('sub 3', {} as any);
    root.addTest('test 5', {} as any);
    root.endTest();
    expect(
      getAllParents(root.root, root.currentSuite, isType('suite')).map(
        t => t.data.name,
      ),
    ).toEqual(['parent', 'child', 'sub', 'sub 2', 'sub 3']);
  });
});
