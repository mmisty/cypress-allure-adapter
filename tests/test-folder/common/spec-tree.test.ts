import {
  getParents,
  printTreeWithIndents,
  SpecTree,
} from '../../../src/plugins/tree-utils';

describe('spec tree', () => {
  it('test with parent suite', () => {
    const root = new SpecTree();
    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--parent',
      '----test 1',
    ]);
  });

  it('2 tests with parent suite', () => {
    const root = new SpecTree();
    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);
    root.addTest('test 2', {} as any);

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--parent',
      '----test 1',
      '----test 2',
    ]);
  });

  it('global hook', () => {
    const root = new SpecTree();
    root.addHook('global hook', {} as any);
    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--global hook',
      '--parent',
      '----test 1',
    ]);
  });

  it('global hook and suite hook', () => {
    const root = new SpecTree();
    root.addHook('global hook 1', {} as any);
    root.addSuite('parent', {} as any);
    root.addHook('global hook 2', {} as any);
    root.addTest('test 1', {} as any);

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
    root.addHook('global hook 1', {} as any);
    root.addHook('global hook 2', {} as any);
    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);

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
    root.addHook('global hook 1', {} as any);
    root.addStep('step 1', {} as any);
    root.addStep('step 2', {} as any);
    root.endStep();
    root.endStep();

    root.addHook('global hook 2', {} as any);
    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);
    root.addStep('step 5', {} as any);
    root.endStep();
    root.addStep('step 6', {} as any);
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
    root.addHook('global hook 1', {} as any);
    root.addStep('step 1', {} as any);
    root.addStep('step 2', {} as any);
    root.endAllSteps();

    root.addHook('global hook 2', {} as any);
    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);

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

  it('end all suites', () => {
    const root = new SpecTree();
    root.addHook('global hook 1', {} as any);
    root.addStep('step 1', {} as any);
    root.addStep('step 2', {} as any);
    root.endAllSteps();

    root.addHook('global hook 2', {} as any);
    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);
    root.addSuite('sub', {} as any);
    root.addTest('test 2', {} as any);
    root.endAllSuites();
    root.addSuite('parent 2', {} as any);
    root.addTest('test 3', {} as any);

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--global hook 1',
      '----step 1',
      '------step 2',
      '--global hook 2',
      '--parent',
      '----test 1',
      '----sub',
      '------test 2',
      '--parent 2',
      '----test 3',
    ]);
  });

  it('add test without suite', () => {
    const root = new SpecTree();
    root.addTest('test 1', {} as any);
    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--test 1',
    ]);
  });

  it('add step without suite', () => {
    const root = new SpecTree();
    root.addStep('step 1', {} as any);
    expect(printTreeWithIndents(root.root, t => t.name)).toEqual(['root']);
  });

  it.skip('test 1', () => {
    const root = new SpecTree();
    root.addSuite('parent', {} as any);
    root.addHook('hook 1', {} as any);
    root.addStep('hook 1 step', {} as any);
    root.addHook('hook 2', {} as any);
    root.addSuite('sub', {} as any);
    root.addTest('test 1', {} as any);
    root.addTest('test 2', {} as any);
    root.addStep('apple ', {} as any);
    root.addStep('banana ', {} as any);

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

  it('test all', () => {
    const root = new SpecTree();
    root.addHook('global hook 1', {} as any);
    root.addStep('apple', {} as any);
    root.endHook();

    root.addHook('global hook 2', {} as any);
    root.endHook();

    root.addSuite('parent', {} as any);
    root.addTest('test 1', {} as any);
    root.endTest();

    root.addSuite('sub', {} as any);
    root.addTest('test 2', {} as any);
    root.endTest();
    root.endAllSuites();

    root.addSuite('parent 2', {} as any);
    root.addTest('test 3', {} as any);
    root.endTest();
    root.endSuite();

    expect(printTreeWithIndents(root.root, t => t.name)).toEqual([
      'root',
      '--global hook 1',
      '----apple',
      '--global hook 2',
      '--parent',
      '----test 1',
      '----sub',
      '------test 2',
      '--parent 2',
      '----test 3',
    ]);
    expect({
      currentHook: root.currentHook,
      currentSuite: root.currentSuite,
      currentTest: root.currentTest,
      currentStep: root.currentStep,
    }).toEqual({
      currentHook: undefined,
      currentSuite: undefined,
      currentTest: undefined,
      currentStep: undefined,
    });
  });
});
