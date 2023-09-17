import { addGroupLabels } from '../../../src/plugins/allure-utils';
import { SpecTree } from '../../../src/plugins/tree-utils';

describe('allure-utils', () => {
  it('add labels', () => {
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

    // add group labels for current suite
    expect(addGroupLabels(root)).toEqual([
      {
        name: 'parentSuite',
        value: 'parent',
      },
      {
        name: 'suite',
        value: 'child',
      },
      {
        name: 'subSuite',
        value: 'sub',
      },
    ]);

    root.endAllSuites();
  });
});
