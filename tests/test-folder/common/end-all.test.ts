import { SpecTree } from '../../../src/plugins/tree-utils';
import { allureTasks } from '../../../src/plugins/allure';
import { Status } from '../../../src/plugins/allure-types';

describe('spec tree', () => {
  describe('endAll', () => {
    it('endAll steps when no steps started', () => {
      const root = new SpecTree();
      root.endAllSteps();

      expect(root.currentStep).toBeUndefined();
    });

    it('endAll suites when no steps started', () => {
      const root = new SpecTree();

      while (root.currentSuite !== undefined) {
        root.endSuite();
      }

      expect(root.currentSuite).toBeUndefined();
    });

    it('endAll hooks when no hooks started', () => {
      const root = new SpecTree();

      while (root.currentHook !== undefined) {
        root.endHook();
      }

      expect(root.currentHook).toBeUndefined();
    });

    it('endAll hooks when hooks started', () => {
      const root = new SpecTree();

      root.addHook('before all', {} as any);

      while (root.currentHook !== undefined) {
        root.endHook();
      }
      expect(root.currentHook).toBeUndefined();
    });

    it('endAll hooks with reporter - should end all glonbal hooks before starting test', () => {
      const reporter = allureTasks({
        allureAddVideoOnPass: false,
        allureResults: 'allure-results',
        techAllureResults: 'allure-results/watch',
        videos: 'vid',
        screenshots: 'scr',
        showDuplicateWarn: false,
        isTest: false,
      });
      reporter.endAll({});
      reporter.specStarted({
        spec: {
          name: 'spec name',
          absolute: `${process.cwd()}/integration/e2e/spec name`,
          relative: 'path',
        },
      });

      reporter.endAll({});
      reporter.endAll({});
      reporter.hookStarted({
        title: "'before all' hook: Test hello",
        hookId: 'h1',
      });
      reporter.stepStarted({
        name: 'step',
      });
      reporter.stepEnded({ status: Status.PASSED });
      reporter.endAll({});
    });
  });
});
