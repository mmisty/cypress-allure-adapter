import { expect } from 'expect';
import {
  mapAttachments,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest, getParentsArray } from 'allure-js-parser';

type MapStepsResult = { name: string | undefined; steps: MapStepsResult[] };

function mapSteps(
  steps: AllureTest['steps'],
  filter?: (s: AllureTest['steps'][number]) => boolean,
): MapStepsResult[] {
  return steps.filter(filter ?? (() => true)).map(s => ({
    name: s.name,
    steps: mapSteps(s.steps, filter),
  }));
}

describe('regression steps - failed global hook', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'true' },
    });
  });

  it('should have 3 tests', () => {
    expect(results.watchResults.length).toEqual(3);
  });

  it('tests should have correct names', () => {
    expect(results.watchResults.map(t => t.fullName).sort()).toEqual([
      'hooks test - failed global hook step more tests test 3',
      'hooks test - failed global hook step test 1',
      'hooks test - failed global hook step test 2',
    ]);
  });

  describe('test attachments', () => {
    it('all tests should have screenshot attachment', () => {
      const attachments = results.watchResults.flatMap(t =>
        mapAttachments(t.attachments),
      );
      expect(attachments.sort()).toEqual([
        {
          name: 'test 1 -- before all hook Global Setup (failed).png',
          source: 'source.png',
          type: 'image/png',
        },
        {
          name: 'test 1 -- before all hook Global Setup (failed).png',
          source: 'source.png',
          type: 'image/png',
        },
        {
          name: 'test 1 -- before all hook Global Setup (failed).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('befores should have no attachments', () => {
      const beforesAttachments = results.watchResults.map(t =>
        t.parent?.befores?.flatMap(x => mapAttachments(x.attachments)),
      );
      expect(beforesAttachments.sort()).toEqual([[], [], []]);
    });

    it('afters should have video attachment', () => {
      const aftersAttachments = results.watchResults.map(t =>
        t.parent?.afters?.flatMap(x => mapAttachments(x.attachments)),
      );
      expect(aftersAttachments.sort()).toEqual([
        [
          {
            name: 'spec.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        [
          {
            name: 'spec.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        [
          {
            name: 'spec.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
      ]);
    });
  });

  describe('labels', () => {
    it('all tests should have correct path label', () => {
      const pathLabels = results.watchResults.map(t =>
        t.labels.filter(l => l.name === 'path'),
      );
      pathLabels.forEach(labels => {
        expect(labels.length).toEqual(1);
        expect(labels[0].value).toContain('spec.cy.ts');
      });
    });

    it('all tests should have correct package label', () => {
      const packageLabels = results.watchResults.map(t =>
        t.labels.filter(l => l.name === 'package'),
      );
      packageLabels.forEach(labels => {
        expect(labels.length).toEqual(1);
        expect(labels[0].value).toContain('spec.cy.ts');
      });
    });
  });

  describe('befores steps', () => {
    it('first test should have correct befores steps', () => {
      const test = results.watchResults.find(t => t.name === 'test 1');
      const parents = getParentsArray(test);

      const beforesSteps = parents.map(p =>
        p.befores?.map(b =>
          mapSteps(b.steps, s => s.name?.indexOf('coverage') === -1),
        ),
      );

      expect(beforesSteps).toEqual([
        [
          [],
          [{ name: 'global setup', steps: [] }],
          [{ name: 'global setup2', steps: [{ name: 'wrap', steps: [] }] }],
        ],
      ]);
    });

    it('second test should have correct befores steps', () => {
      const test = results.watchResults.find(t => t.name === 'test 2');
      const parents = getParentsArray(test);

      const beforesSteps = parents.map(p =>
        p.befores?.map(b =>
          mapSteps(b.steps, s => s.name?.indexOf('coverage') === -1),
        ),
      );

      expect(beforesSteps).toEqual([
        [
          [],
          [{ name: 'global setup', steps: [] }],
          [{ name: 'global setup2', steps: [{ name: 'wrap', steps: [] }] }],
        ],
      ]);
    });
  });

  describe('afters steps', () => {
    it('first test should have correct afters steps', () => {
      const test = results.watchResults.find(t => t.name === 'test 1');
      const parents = getParentsArray(test);

      const aftersSteps = parents.map(p =>
        p.afters?.map(a =>
          mapSteps(a.steps, s => s.name?.indexOf('coverage') === -1),
        ),
      );

      expect(aftersSteps).toEqual([
        [[], [], [], [{ name: 'global teardown', steps: [] }], []],
      ]);
    });
  });

  it('tests should have no body steps', () => {
    const testSteps = results.watchResults.map(t => t.steps.map(s => s.name));
    expect(testSteps).toEqual([[], [], []]);
  });
});
