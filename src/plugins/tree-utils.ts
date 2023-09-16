import { AllureGroup, AllureStep, AllureTest, ExecutableItemWrapper } from 'allure-js-commons';
import { GlobalHookC } from './allure-global-hook2';

export type DataType = 'suite' | 'hook' | 'step' | 'test' | 'root';
export type DataTree<T = any> = { name: string; type: DataType; value?: T };
type ConditionFn<T> = (t: T) => boolean;

export const isType =
  (checkType: DataType) =>
  <T>(t: DataTree<T>) =>
    t.type === checkType;

export class SpecTree {
  public root: Tree<DataTree>;

  constructor() {
    this.root = new Tree({ name: 'root', type: 'root' });
  }

  public currentSuite: Tree<DataTree<AllureGroup>> | undefined = undefined;
  public currentHook: Tree<DataTree<ExecutableItemWrapper | GlobalHookC>> | undefined = undefined;
  public currentTest: Tree<DataTree<{ test: AllureTest; id: string; uuid: string }>> | undefined = undefined;
  public currentStep: Tree<DataTree<AllureStep>> | undefined = undefined;

  addHook(name: string, hook: ExecutableItemWrapper | GlobalHookC) {
    const addTo = this.currentSuite ?? this.root;

    this.currentHook = addTo.add({ name, type: 'hook', value: hook });
  }

  endHook() {
    this.endAllSteps();

    if (this.currentHook) {
      this.currentHook = getClosestParent(this.currentHook, isType('hook'));
    }
  }

  addSuite(name: string, data: AllureGroup) {
    const addTo = this.currentSuite ?? this.root;

    this.currentSuite = addTo.add({ name, type: 'suite', value: data });
  }

  endSuite() {
    this.endAllSteps();

    if (this.currentSuite) {
      this.currentSuite = getClosestParent(this.currentSuite, isType('suite'));
    }
  }

  addTest(name: string, value: { test: AllureTest; id: string; uuid: string }) {
    const addTo = this.currentSuite ?? this.root;

    this.currentTest = addTo.add({ name, type: 'test', value });
  }

  endTest() {
    this.endAllSteps();

    if (this.currentTest) {
      this.currentTest = getClosestParent(this.currentTest, isType('test'));
    }
  }

  addStep(name: string, step: AllureStep) {
    const addTo = this.currentStep ?? this.currentTest ?? this.currentHook;

    if (!addTo) {
      console.log('cannot start step when no step/test/hook ');

      return;
    }

    // todo type
    this.currentStep = (addTo as Tree<DataTree<AllureStep>>).add({ name, type: 'step', value: step });
  }

  endStep() {
    if (this.currentStep) {
      this.currentStep = getClosestParent(this.currentStep, isType('step'));
    }
  }

  endAllSteps() {
    while (this.currentStep !== undefined) {
      this.currentStep = getClosestParent(this.currentStep, isType('step'));
    }
  }

  endAllSuites() {
    while (this.currentSuite !== undefined) {
      this.currentSuite = getClosestParent(this.currentSuite, isType('suite'));
    }
  }
}

export const findHooksForCurrentSuite = (specs: SpecTree) => {
  const condition = (t: DataTree) => t.type === 'hook';

  return [
    ...findSiblingsForParents(specs.root, specs.currentSuite, condition),
    ...findSiblings(specs.root, specs.currentSuite, condition),
    ...findChildren(specs.currentSuite, condition),
  ];
};

export class Tree<T> {
  children: Tree<T>[] = [];
  parent: Tree<T> | undefined;

  constructor(
    public data: T,
    parent?: Tree<T>,
  ) {
    //this.current = null;
    this.parent = parent;
  }

  add(d: T): Tree<T> {
    const node = new Tree(d, this);
    this.children.push(node);

    return node;
  }
}

/**
 * Get tree items of specified type to array
 * @param tree
 * @param condition
 * @param res
 */
export const getItems = <T>(tree: Tree<T>, condition: ConditionFn<T>, res: T[] = []) => {
  if (condition(tree.data)) {
    res.push(tree.data);
  }

  if (tree.children.length !== 0) {
    tree.children.forEach((data, i) => {
      return getItems(tree.children[i], condition, res);
    });
  }

  return res;
};

export const deleteByCondition = <T>(tree: Tree<T>, condition: ConditionFn<T>) => {
  const mergeChildren = (node: Tree<T>) => {
    if (node.children && node.children.length > 0) {
      const mergedChildren: Tree<T>[] = [];

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        mergeChildren(child);

        if (condition(child.data)) {
          mergedChildren.push(...child.children);
        } else {
          mergedChildren.push(child);
        }
      }

      node.children = mergedChildren;
    }
  };

  mergeChildren(tree);

  return tree;
};

/**
 * Get chain of parents
 *
 */
export const getParents = <T>(tree: Tree<T> | undefined, condition?: ConditionFn<T>): Tree<T>[] => {
  const res: Tree<T>[] = [];

  if (tree === undefined) {
    return [];
  }
  let ch = tree;

  while (ch.parent !== undefined) {
    if (!condition || condition(ch.parent.data)) {
      res.push(ch.parent);
    }

    ch = ch.parent;
  }

  return res;
};

/**
 * get parents in order including current node
 * @param tree
 * @param current
 * @param condition
 */
export const getAllParents = <T>(tree: Tree<T>, current: Tree<T> | undefined, condition: ConditionFn<T>): Tree<T>[] => {
  return [...getParents(current, condition).reverse(), ...findSiblingsForParents(tree, current, condition)];
};

export const getClosestParent = <T>(tree: Tree<T>, condition?: ConditionFn<T>): Tree<T> | undefined => {
  let ch = tree;

  while (ch.parent !== undefined) {
    if (!condition || condition(ch.parent.data)) {
      return ch.parent;
    }

    ch = ch.parent;
  }

  return undefined;
};

export function findSiblings<T>(root: Tree<T>, target: Tree<T> | undefined, condition: ConditionFn<T>): Tree<T>[] {
  const siblings: Tree<T>[] = [];

  if (target === undefined) {
    return [];
  }

  // Helper function to traverse the tree using depth-first search (DFS)
  function dfs(node: Tree<T>, parentNode: Tree<T> | null, cond: ConditionFn<T>) {
    if (node === target && parentNode) {
      siblings.push(...(parentNode.children || []).filter(child => child !== target && cond(child.data)));

      return;
    }

    if (node.children) {
      node.children.forEach(child => dfs(child, node, condition));
    }
  }

  dfs(root, null, condition);

  return siblings;
}

export const findSiblingsForParents = <T>(
  root: Tree<T>,
  tree: Tree<T> | undefined,
  condition: ConditionFn<T>,
): Tree<T>[] => {
  if (!tree) {
    return [];
  }
  const parents = getParents(tree).reverse();

  const current = condition(tree.data) ? [tree] : [];

  return [...parents.flatMap(t => findSiblings(root, t, condition)), ...current];
};

/**
 * Find current not children by condition
 * @param tree
 * @param condition
 */
export const findChildren = <T>(tree: Tree<T> | undefined, condition: ConditionFn<T>) => {
  if (!tree) {
    return [];
  }

  return tree.children.filter(t => condition(t.data));
};

export function printTreeWithIndents<T>(
  tree: Tree<T>,
  propFn: (t: T) => string,
  strings: string[] = [],
  level = 0,
  indentSize = 2,
): string[] {
  const indent: string = '-'.repeat(indentSize * level);
  strings.push(indent + propFn(tree.data));

  if (tree.children) {
    for (const child of tree.children) {
      printTreeWithIndents(child, propFn, strings, level + 1, indentSize);
    }
  }

  return strings;
}
