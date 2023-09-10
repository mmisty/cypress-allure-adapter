import {
  getItems,
  getParents,
  removeChildrenWithType,
  SpecTree,
} from '../../../src/plugins/tree-utils';

describe('suite', () => {
  let root: SpecTree;
  let hooks: SpecTree;
  let suite2: SpecTree;
  let test2: SpecTree;
  let suite3: SpecTree;
  let test3: SpecTree;
  let step: SpecTree;

  beforeEach(() => {
    root = new SpecTree({ name: 'root' });
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
    expect(getParents(test3, 'suite').map(t => t.data.name)).toEqual([
      'suite 3',
      'suite 2',
      'suite 1',
    ]);
  });

  it('should get all Test parents for test', () => {
    expect(getParents(test3, 'test').map(t => t.data.name)).toEqual([]);
  });

  it('should get all Hooks for test', () => {
    // all hooks
    expect(getParents(test3, 'hook').map(t => t.data.name)).toEqual([
      'hook 4',
      'hook 3',
      'hook 2',
      'hook 1',
    ]);
  });

  it('should get all Hooks for other test', () => {
    // all hooks
    // all hooks
    expect(getParents(test2, 'hook').map(t => t.data.name)).toEqual([
      'hook 3',
      'hook 2',
      'hook 1',
    ]);
  });

  it('should get all tests in the tree', () => {
    expect(getItems(root, 'test', [])).toEqual([
      'test 1',
      'test 2',
      'test 3',
      'test 4',
    ]);
  });

  it('should get all items for test', () => {
    expect(getItems(test3, '', [])).toEqual([
      'test 3',
      'step 1',
      'step 2',
      'step 3',
    ]);
  });

  it('should delete all steps for test', () => {
    removeChildrenWithType(test3, 'step');
    expect(getItems(test3, '', [])).toEqual(['test 3']);
    expect(getItems(test3, 'step', [])).toEqual([]);
  });

  it('should delete all steps (except others) for test', () => {
    test3.add({ name: 'attach1' });
    step.add({ name: 'attach2' });
    expect(getItems(test3, '', [])).toEqual([
      'test 3',
      'step 1',
      'step 2',
      'attach2',
      'step 3',
      'attach1',
    ]);
    removeChildrenWithType(test3, 'step');
    expect(getItems(test3, '', [])).toEqual(['test 3', 'attach1', 'attach2']);
    expect(getItems(test3, 'step', [])).toEqual(['attach1', 'attach2']);
  });
});
