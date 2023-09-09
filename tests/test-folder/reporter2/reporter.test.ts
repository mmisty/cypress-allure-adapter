// import { AllureReporter2 } from 'src/plugins/allure-reporter-2';

import { AllureReporter2 } from '../../../src/plugins/allure-reporter-2';

describe('suite', () => {
  let reporter: AllureReporter2;
  beforeEach(() => {
    reporter = new AllureReporter2({
      allureResults: 'allure-results-reporter2',
    });
  });

  it('should start one group', () => {
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });

    expect(reporter.currentGroup?.name).toEqual('Hello');
  });

  it('should start 2 groups', () => {
    const groups: (string | undefined)[] = [];
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });
    groups.push(reporter.currentGroup?.name);
    reporter.startGroup({ title: 'Sub', fullTitle: 'any' });
    groups.push(reporter.currentGroup?.name);

    expect(groups).toEqual(['Hello', 'Sub']);
  });

  it('should end group', () => {
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });
    reporter.startGroup({ title: 'Sub', fullTitle: 'any' });

    reporter.endGroup();
    const d = reporter.printList();
    expect(d.map(t => t.data?.value.name)).toEqual(['Hello']);
  });

  it('should start test', () => {
    const groups: (string | undefined)[] = [];
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });
    groups.push(reporter.currentGroup?.name);
    reporter.startGroup({ title: 'Sub', fullTitle: 'any' });
    groups.push(reporter.currentGroup?.name);
    reporter.startTest({ title: 'Test', id: '1', fullTitle: 'any' });
    groups.push((reporter.currentTest as any)?.info?.name);
    const d = reporter.printList();

    expect(
      d.map(t => t.data?.value.name ?? (t?.data?.value as any)?.info?.name),
    ).toEqual(['Test', 'Sub', 'Hello']);
    expect(groups).toEqual(['Hello', 'Sub', 'Test']);
  });

  it('should end test', () => {
    reporter.startGroup({ title: 'Hello', fullTitle: 'any' });
    reporter.startGroup({ title: 'Sub', fullTitle: 'any' });
    reporter.startTest({ title: 'Test', id: '1', fullTitle: 'any' });
    reporter.endTest();
    reporter.endGroup();
    reporter.endGroup();
    const d1 = reporter.printList();
    expect(d1.map(t => t.data?.value.name)).toEqual([]);
  });
});
