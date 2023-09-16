import {
  findSiblings,
  getParents,
  printTreeWithIndents,
  SpecTree,
  Tree,
} from '../../../src/plugins/tree-utils';

describe('spec tree', () => {
  const getParentsList = (
    tree: Tree<any> | undefined,
    type: 'suite' | 'test' | 'step' | 'hook',
  ) => {
    return tree
      ? getParents(tree, t => t.type === type).map(t => t.data.name)
      : undefined;
  };

  it('test with parent suite', () => {
    const root = new SpecTree();
    root.addSuite('parent');
    root.addTest('test 1');

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--parent',
      '----test 1',
    ]);
  });

  it('2 tests with parent suite', () => {
    const root = new SpecTree();
    root.addSuite('parent');
    root.addTest('test 1');
    root.addTest('test 2');

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--parent',
      '----test 1',
      '----test 2',
    ]);
  });

  it('global hook', () => {
    const root = new SpecTree();
    root.addHook('global hook');
    root.addSuite('parent');
    root.addTest('test 1');

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--global hook',
      '--parent',
      '----test 1',
    ]);
  });

  it('global hook and suite hook', () => {
    const root = new SpecTree();
    root.addHook('global hook 1');
    root.addSuite('parent');
    root.addHook('global hook 2');
    root.addTest('test 1');

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--global hook 1',
      '--parent',
      '----global hook 2',
      '----test 1',
    ]);
  });

  it('several global hooks and suite hook', () => {
    const root = new SpecTree();
    root.addHook('global hook 1');
    root.addHook('global hook 2');
    root.addSuite('parent');
    root.addTest('test 1');

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--global hook 1',
      '--global hook 2',
      '--parent',
      '----test 1',
    ]);
  });

  it('steps stree', () => {
    const root = new SpecTree();
    root.addHook('global hook 1');
    root.addStep('step 1');
    root.addStep('step 2');
    root.endStep();
    root.endStep();

    root.addHook('global hook 2');
    root.addSuite('parent');
    root.addTest('test 1');
    root.addStep('step 5');
    root.endStep();
    root.addStep('step 6');
    root.endStep();

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--global hook 1',
      '----step 1',
      '------step 2',
      '--global hook 2',
      '--parent',
      '----test 1',
      '------step 5',
      '------step 6',
    ]);
  });

  it('end all steps', () => {
    const root = new SpecTree();
    root.addHook('global hook 1');
    root.addStep('step 1');
    root.addStep('step 2');
    root.endAllSteps();

    root.addHook('global hook 2');
    root.addSuite('parent');
    root.addTest('test 1');

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--global hook 1',
      '----step 1',
      '------step 2',
      '--global hook 2',
      '--parent',
      '----test 1',
    ]);
  });

  it('add test without suite', () => {
    const root = new SpecTree();
    root.addTest('test 1');
    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--test 1',
    ]);
  });

  it('add step without suite', () => {
    const root = new SpecTree();
    root.addStep('step 1');
    expect(printTreeWithIndents(root.root, t => t.name)).toEqual(['root']);
  });

  it('find siblings', () => {
    const root = new SpecTree();
    root.addHook('hook 1');
    root.addHook('hook 2');
    root.addSuite('suite 2');
    root.addTest('test 1');
    root.addTest('test 2');

    const siblings = findSiblings(
      root.root,
      root.currentSuite,
      t => t.type === 'hook',
    );
    expect(siblings.map(t => t.data.name)).toEqual(['hook 1', 'hook 2']);
  });

  it.skip('test 1', () => {
    const root = new SpecTree();
    root.addSuite('parent');
    root.addHook('hook 1');
    root.addStep('hook 1 step');
    root.addHook('hook 2');
    root.addSuite('sub');
    root.addTest('test 1');
    root.addTest('test 2');
    root.addStep('apple ');
    root.addStep('banana ');

    console.log(
      printTreeWithIndents(root.root, t => `${t.type}: ${t.name}`).join('\n'),
    );

    expect(
      getParents(root.currentTest!, t => t.type === 'suite').map(
        t => t.data.name,
      ),
    ).toEqual(['sub', 'parent']);

    expect(
      getParents(
        root.currentTest!,
        t => t.type === 'suite' || t.type === 'hook',
      ).map(t => t.data.name),
    ).toEqual(['sub', 'hook 2', 'hook 1', 'parent']);
  });
});
