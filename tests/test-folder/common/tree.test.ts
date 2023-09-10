import {
  deleteByCondition,
  getClosestParent,
  getItems,
  getParents,
  Tree,
} from '../../../src/plugins/tree-utils';

describe('tree-utils', () => {
  type Data = { name: string };
  let root: Tree<Data>;
  let hooks: Tree<Data>;
  let suite2: Tree<Data>;
  let test2: Tree<Data>;
  let suite3: Tree<Data>;
  let test3: Tree<Data>;
  let step: Tree<Data>;

  beforeEach(() => {
    root = new Tree({ name: 'root' });
    hooks = root.add({ name: 'hook 1' }).add({ name: 'hook 2' });

    suite2 = hooks
      .add({ name: 'suite 1' })
      .add({ name: 'suite 2' })
      .add({ name: 'hook 3' });

    suite2.add({ name: 'test 1' });
    test2 = suite2.add({ name: 'test 2' });

    suite3 = suite2.add({ name: 'suite 3' }).add({ name: 'hook 4' });
    test3 = suite3.add({ name: 'test 3' });
    step = test3.add({ name: 'step 1' });
    step.add({ name: 'step 2' });
    test3.add({ name: 'step 3' });

    hooks.add({ name: 'suite 13' }).add({ name: 'test 4' });
  });

  it('should get all Suite parents for test', () => {
    expect(
      getParents(test3, t => t.name.indexOf('suite') !== -1).map(
        t => t.data.name,
      ),
    ).toEqual(['suite 3', 'suite 2', 'suite 1']);
  });

  it('getClosestParent - should use node to change tree', () => {
    const el = getClosestParent(test3, t => t.name.indexOf('suite') !== -1);
    el!.data.name = `${el!.data.name} NEW NAME`;

    expect(
      getParents(test3, t => t.name.indexOf('suite') !== -1).map(
        t => t.data.name,
      ),
    ).toEqual(['suite 3 NEW NAME', 'suite 2', 'suite 1']);
  });

  it('should get all Test parents for test', () => {
    expect(
      getParents(test3, t => t.name.indexOf('test') !== -1).map(
        t => t.data.name,
      ),
    ).toEqual([]);
  });

  it('should get all Hooks for test', () => {
    // all hooks
    expect(
      getParents(test3, t => t.name.indexOf('hook') !== -1).map(
        t => t.data.name,
      ),
    ).toEqual(['hook 4', 'hook 3', 'hook 2', 'hook 1']);
  });

  it('should get all Hooks for other test', () => {
    // all hooks
    expect(
      getParents(test2, t => t.name.indexOf('hook') !== -1).map(
        t => t.data.name,
      ),
    ).toEqual(['hook 3', 'hook 2', 'hook 1']);
  });

  it('should get all tests in the tree', () => {
    expect(
      getItems(root, t => t.name.indexOf('test') !== -1, []).map(t => t.name),
    ).toEqual(['test 1', 'test 2', 'test 3', 'test 4']);
  });

  it('should get all items for test', () => {
    expect(
      getItems(test3, t => t.name.indexOf('') !== -1, []).map(t => t.name),
    ).toEqual(['test 3', 'step 1', 'step 2', 'step 3']);
  });

  it('should delete all steps for test', () => {
    deleteByCondition(test3, t => t.name.indexOf('step') !== -1);
    expect(
      getItems(test3, t => t.name.indexOf('') !== -1, []).map(t => t.name),
    ).toEqual(['test 3']);
    expect(getItems(test3, t => t.name.indexOf('step') !== -1, [])).toEqual([]);
  });

  it('should delete all steps (except others) for test', () => {
    test3.add({ name: 'attach1' });
    step.add({ name: 'attach2' });
    expect(
      getItems(test3, t => t.name.indexOf('') !== -1, []).map(t => t.name),
    ).toEqual(['test 3', 'step 1', 'step 2', 'attach2', 'step 3', 'attach1']);
    deleteByCondition(test3, t => t.name.indexOf('step') !== -1);

    expect(
      getItems(test3, t => t.name.indexOf('') !== -1, []).map(t => t.name),
    ).toEqual(['test 3', 'attach2', 'attach1']);

    expect(test3.children.map(t => t.data.name)).toEqual([
      'attach2',
      'attach1',
    ]);

    expect(getItems(test3, t => t.name.indexOf('step') !== -1, [])).toEqual([]);
  });
});
