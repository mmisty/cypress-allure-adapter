import {
  checkCyResults,
  createResTest2,
  fixResult,
  fullStepAttachment,
} from '../../../cy-helper/utils';
import { AllureTest, parseAllure } from 'allure-js-parser';

describe('test screenshot event (no element)', () => {
  const res = createResTest2(
    [
      `
describe('test screenshot with setting', () => {
  it('01 screenshot test - to step without name', () => {
    cy.allure().startStep('my step');
    cy.screenshot({ allureAttachToStep: true });
    cy.allure().endStep();
  });
  
  it('02.1 screenshot test - to test without name (with option false)', () => {
    cy.allure().startStep('my step');
    cy.screenshot({ allureAttachToStep: false });
    cy.allure().endStep();
  });
  
  it('02.2 screenshot test - to test without name (no option)', () => {
    cy.allure().startStep('my step');
    cy.screenshot();
    cy.allure().endStep();
  });
  
  it('03 screenshot test - to step WITH name', () => {
    cy.allure().startStep('my step');
    cy.screenshot('my-step', { allureAttachToStep: true });
    cy.allure().endStep();
  });
  
  it('04.1 screenshot test - to step WITH name (with option false)', () => {
    cy.allure().startStep('my step');
    cy.screenshot('my-step', { allureAttachToStep: false });
    cy.allure().endStep();
  });
  
  it('04.2 screenshot test - to test WITH name (no option)', () => {
    cy.allure().startStep('my step');
    cy.screenshot('my-step');
    cy.allure().endStep();
  });
  
  
  it('05 screenshot test - to step WITH name for ELEMENT', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot('my-step', { allureAttachToStep: true });
    cy.allure().endStep();
  });
  
  it('06.1 screenshot test - to step WITH name (with option false) for ELEMENT', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot('my-step', { allureAttachToStep: false });
    cy.allure().endStep();
  });
  
  it('06.2 screenshot test - to test WITH name (no option) for ELEMENT', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot('my-step');
    cy.allure().endStep();
  });
  
  it('07 screenshot test - to step WITH name for ELEMENT no name', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot({ allureAttachToStep: true });
    cy.allure().endStep();
  });
  
  it('08.1 screenshot test - to step WITH name (with option false) for ELEMENT no name', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot({ allureAttachToStep: false });
    cy.allure().endStep();
  });
  
  it('08.2 screenshot test - to test WITH name (no option) for ELEMENT no name', () => {
    cy.allure().startStep('my step');
    cy.get('div').screenshot();
    cy.allure().endStep();
  });
});
`,
    ],
    { allureAddVideoOnPass: 'false', allureSkipCommands: 'screenshot' },
  );

  describe('check results', () => {
    let results: AllureTest[];
    let fixed: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
      fixed = fixResult(results);
    });

    it('check cypress results', () => {
      checkCyResults(res?.result?.res, { totalPassed: 12 });
    });

    it('01 check test with screenshot to step without name', async () => {
      const test = fixed.find(t => t.name?.includes('01'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [],
          name: '01 screenshot test - to step without name',
          status: 'passed',
          parents: [],
          steps: [
            {
              attachments: [
                {
                  name: 'test screenshot with setting -- 01 screenshot test - to step without name.png',
                  source: 'source.png',
                  type: 'image/png',
                },
              ],
              name: 'my step',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('02.1 check test with screenshot to test without name (option is false)', async () => {
      const test = fixed.find(t => t.name?.includes('02.1'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [
            {
              name: 'test screenshot with setting -- 02.1 screenshot test - to test without name (with option false).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '02.1 screenshot test - to test without name (with option false)',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'my step',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('02.2 check test with screenshot to test without name (not option)', async () => {
      const test = fixed.find(t => t.name?.includes('02.2'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [
            {
              name: 'test screenshot with setting -- 02.2 screenshot test - to test without name (no option).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '02.2 screenshot test - to test without name (no option)',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'my step',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('03 check test with screenshot to test WITH name', async () => {
      const test = fixed.find(t => t.name?.includes('03'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [],
          name: '03 screenshot test - to step WITH name',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [
                {
                  name: 'my-step.png',
                  source: 'source.png',
                  type: 'image/png',
                },
              ],
              name: 'my step',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('04.1 check test with screenshot to test WITH name (option is false)', async () => {
      const test = fixed.find(t => t.name?.includes('04.1'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [
            {
              name: 'my-step (1).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '04.1 screenshot test - to step WITH name (with option false)',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'my step',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('04.2 check test with screenshot to test WITH name (no option)', async () => {
      const test = fixed.find(t => t.name?.includes('04.2'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [
            {
              name: 'my-step (2).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '04.2 screenshot test - to test WITH name (no option)',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'my step',
              steps: [],
            },
          ],
        },
      ]);
    });

    it('05 check test with screenshot to test WITH name for Element', async () => {
      const test = fixed.find(t => t.name?.includes('05'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [],
          name: '05 screenshot test - to step WITH name for ELEMENT',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [
                {
                  name: 'my-step (3).png',
                  source: 'source.png',
                  type: 'image/png',
                },
              ],
              name: 'my step',
              steps: [
                {
                  attachments: [],
                  name: 'get: div',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('06.1 check test with screenshot to test WITH name (option false) for Element', async () => {
      const test = fixed.find(t => t.name?.includes('06.1'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [
            {
              name: 'my-step (4).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '06.1 screenshot test - to step WITH name (with option false) for ELEMENT',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'my step',
              steps: [
                {
                  attachments: [],
                  name: 'get: div',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('06.2 check test with screenshot to test WITH name (no option) for Element', async () => {
      const test = fixed.find(t => t.name?.includes('06.2'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [
            {
              name: 'my-step (5).png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '06.2 screenshot test - to test WITH name (no option) for ELEMENT',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'my step',
              steps: [
                {
                  attachments: [],
                  name: 'get: div',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('07 check test with screenshot to test WITH name for Element no name', async () => {
      const test = fixed.find(t => t.name?.includes('07'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [],
          name: '07 screenshot test - to step WITH name for ELEMENT no name',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [
                {
                  name: 'test screenshot with setting -- 07 screenshot test - to step WITH name for ELEMENT no name.png',
                  source: 'source.png',
                  type: 'image/png',
                },
              ],
              name: 'my step',
              steps: [
                {
                  attachments: [],
                  name: 'get: div',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('08.1 check test with screenshot to test WITH name (option false) for Element no name', async () => {
      const test = fixed.find(t => t.name?.includes('08.1'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [
            {
              name: 'test screenshot with setting -- 08.1 screenshot test - to step WITH name (with option false) for ELEMENT no name.png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '08.1 screenshot test - to step WITH name (with option false) for ELEMENT no name',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'my step',
              steps: [
                {
                  attachments: [],
                  name: 'get: div',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });

    it('08.2 check test with screenshot to test WITH name (no option) for Element no name', async () => {
      const test = fixed.find(t => t.name?.includes('08.2'));
      // there are before all hooks for coverage
      expect(test).toBeDefined();

      const obj = fullStepAttachment([test!], m => ({
        name: m.name,
        attachments: m.attachments,
      }));

      if (obj[0]?.parents) {
        obj[0]['parents'] = [];
      }
      obj[0].steps = obj[0].steps.filter(
        t => !t.name.includes('after each') && !t.name.includes('before each'),
      );
      expect(obj).toEqual([
        {
          attachments: [
            {
              name: 'test screenshot with setting -- 08.2 screenshot test - to test WITH name (no option) for ELEMENT no name.png',
              source: 'source.png',
              type: 'image/png',
            },
          ],
          name: '08.2 screenshot test - to test WITH name (no option) for ELEMENT no name',
          parents: [],
          status: 'passed',
          steps: [
            {
              attachments: [],
              name: 'my step',
              steps: [
                {
                  attachments: [],
                  name: 'get: div',
                  steps: [],
                },
              ],
            },
          ],
        },
      ]);
    });
  });
});
