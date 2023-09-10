export class SpecTree {
  children: SpecTree[] = [];
  parent: SpecTree | undefined;

  constructor(
    public data: { name: string },
    parent?: SpecTree,
  ) {
    //this.current = null;
    this.parent = parent;
  }

  add(d: { name: string }): SpecTree {
    const node = new SpecTree(d, this);
    this.children.push(node);

    return node;
  }
}

/**
 * Get tree items of specified type to array
 * @param tree
 * @param type
 * @param f
 */
export const getItems = (tree: SpecTree, type: string, f: string[]) => {
  if (tree.data.name.indexOf(type) !== -1) {
    f.push(tree.data.name);
  }

  if (tree.children.length !== 0) {
    tree.children.forEach((data, i) => {
      return getItems(tree.children[i], type, f);
    });
  }

  return f;
};

/**
 * Remove items with type
 * @param tree
 * @param type
 */
export const removeChildrenWithType = (tree: SpecTree, type: string, index = 0): void => {
  if (tree.data.name.indexOf(type) !== -1) {
    // Remove only specified element
    tree.parent?.children.splice(index, 1);

    return;
  }

  const updatedChildren: SpecTree[] = [];

  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i];

    if (child.data.name.indexOf(type) === -1) {
      // Recursively remove children with the specified type
      removeChildrenWithType(child, type, i);
      updatedChildren.push(child);
    }
  }

  tree.children = updatedChildren;
};

/**
 * Get chain of parents
 *
 */
export const getParents = (tree: SpecTree, type: string): SpecTree[] => {
  const res: SpecTree[] = [];
  let ch = tree;

  while (ch.parent !== undefined) {
    if (ch.parent.data.name.indexOf(type) !== -1) {
      res.push(ch.parent);
    }

    ch = ch.parent;
  }

  return res;
};
