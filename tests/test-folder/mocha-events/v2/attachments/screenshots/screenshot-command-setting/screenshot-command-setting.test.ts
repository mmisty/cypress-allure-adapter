import { expect } from 'expect';
import {
  getTest,
  mapAttachments,
  mapSteps,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';

describe('screenshot command with allureAttachToStep setting', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'false', allureSkipCommands: 'screenshot' },
    });
  });

  const getTestData = (test: AllureTest | undefined) => {
    const steps = mapSteps(
      test?.steps ?? [],
      t => ({ name: t.name, attachments: mapAttachments(t.attachments) }),
      t =>
        t.name?.indexOf('before each') === -1 &&
        t.name?.indexOf('after each') === -1,
    );

    return {
      attachments: mapAttachments(test?.attachments ?? []),
      steps,
    };
  };

  describe('01 - screenshot to step without name', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '01');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have no direct attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    it('step should have screenshot attachment', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [
            {
              name: 'test screenshot with setting -- 01 screenshot test - to step without name.png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          steps: [],
        },
      ]);
    });
  });

  describe('02.1 - screenshot to test without name (option false)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '02.1');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: 'test screenshot with setting -- 02.1 screenshot test - to test without name (with option false).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('step should have no attachments', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [],
          steps: [],
        },
      ]);
    });
  });

  describe('02.2 - screenshot to test without name (no option)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '02.2');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: 'test screenshot with setting -- 02.2 screenshot test - to test without name (no option).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('step should have no attachments', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [],
          steps: [],
        },
      ]);
    });
  });

  describe('03 - screenshot to step WITH name', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '03');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have no direct attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    it('step should have screenshot attachment', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [
            {
              name: 'my-step.png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          steps: [],
        },
      ]);
    });
  });

  describe('04.1 - screenshot to test WITH name (option false)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '04.1');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: 'my-step (1).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('step should have no attachments', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [],
          steps: [],
        },
      ]);
    });
  });

  describe('04.2 - screenshot to test WITH name (no option)', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '04.2');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: 'my-step (2).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('step should have no attachments', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [],
          steps: [],
        },
      ]);
    });
  });

  describe('05 - screenshot to step WITH name for ELEMENT', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '05');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have no direct attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    it('step should have screenshot attachment with get step', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [
            {
              name: 'my-step (3).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          steps: [
            {
              name: 'get: div',
              attachments: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });

  describe('06.1 - screenshot to test WITH name (option false) for ELEMENT', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '06.1');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: 'my-step (4).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('step should have no attachments but have get step', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [],
          steps: [
            {
              name: 'get: div',
              attachments: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });

  describe('06.2 - screenshot to test WITH name (no option) for ELEMENT', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '06.2');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: 'my-step (5).png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('step should have no attachments but have get step', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [],
          steps: [
            {
              name: 'get: div',
              attachments: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });

  describe('07 - screenshot to step for ELEMENT no name', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '07');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have no direct attachments', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([]);
    });

    it('step should have screenshot attachment with get step', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [
            {
              name: 'test screenshot with setting -- 07 screenshot test - to step WITH name for ELEMENT no name.png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          steps: [
            {
              name: 'get: div',
              attachments: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });

  describe('08.1 - screenshot to test (option false) for ELEMENT no name', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '08.1');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: 'test screenshot with setting -- 08.1 screenshot test - to step WITH name (with option false) for ELEMENT no name.png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('step should have no attachments but have get step', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [],
          steps: [
            {
              name: 'get: div',
              attachments: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });

  describe('08.2 - screenshot to test (no option) for ELEMENT no name', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '08.2');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('test should have screenshot attachment', () => {
      expect(mapAttachments(test?.attachments ?? [])).toEqual([
        {
          name: 'test screenshot with setting -- 08.2 screenshot test - to test WITH name (no option) for ELEMENT no name.png',
          source: 'source.png',
          type: 'image/png',
        },
      ]);
    });

    it('step should have no attachments but have get step', () => {
      const data = getTestData(test);
      expect(data.steps).toEqual([
        {
          name: 'my step',
          attachments: [],
          steps: [
            {
              name: 'get: div',
              attachments: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });
});
