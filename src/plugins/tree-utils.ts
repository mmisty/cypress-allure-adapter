type DataTree = { name: string; type: 'suite' | 'hook' | 'step' | 'test' | 'root'; value?: any };

export class SpecTree {
  public root: Tree<DataTree>;

  constructor() {
    this.root = new Tree({ name: 'root', type: 'root' });
  }

  public currentSuite: Tree<DataTree> | undefined = undefined;
  public currentHook: Tree<DataTree> | undefined = undefined;
  public currentTest: Tree<DataTree> | undefined = undefined;
  public currentStep: Tree<DataTree> | undefined = undefined;

  addHook(name: string) {
    const addTo = this.currentSuite ?? this.root;

    this.currentHook = addTo.add({ name, type: 'hook' });
  }

  addSuite(name: string) {
    const addTo = this.currentSuite ?? this.root;

    this.currentSuite = addTo.add({ name, type: 'suite' });
  }

  addTest(name: string) {
    const addTo = this.currentSuite ?? this.root;

    this.currentTest = addTo.add({ name, type: 'test' });
  }

  addStep(name: string) {
    const addTo = this.currentStep ?? this.currentTest ?? this.currentHook;

    if (!addTo) {
      console.log('cannot start step when no step/test/hook ');

      return;
    }

    this.currentStep = addTo.add({ name, type: 'step' });
  }

  endStep() {
    if (this.currentStep) {
      this.currentStep = getClosestParent(this.currentStep, t => ['step'].includes(t.type));
    }
  }

  endAllSteps() {
    while (this.currentStep !== undefined) {
      this.currentStep = getClosestParent(this.currentStep, t => ['step'].includes(t.type));
    }
  }
}

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
export const getItems = <T>(tree: Tree<T>, condition: (tr: T) => boolean, res: T[] = []) => {
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

export const deleteByCondition = <T>(tree: Tree<T>, condition: (t: T) => boolean) => {
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
export const getParents = <T>(tree: Tree<T>, condition?: (t: T) => boolean): Tree<T>[] => {
  const res: Tree<T>[] = [];
  let ch = tree;

  while (ch.parent !== undefined) {
    if (!condition || condition(ch.parent.data)) {
      res.push(ch.parent);
    }

    ch = ch.parent;
  }

  return res;
};

export const getClosestParent = <T>(tree: Tree<T>, condition?: (t: T) => boolean): Tree<T> | undefined => {
  let ch = tree;

  while (ch.parent !== undefined) {
    if (!condition || condition(ch.parent.data)) {
      return ch.parent;
    }

    ch = ch.parent;
  }

  return undefined;
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
