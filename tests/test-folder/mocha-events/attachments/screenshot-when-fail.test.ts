import {
  checkCyResults,
  createResTest2,
  mapSteps,
} from '../../../cy-helper/utils';
import { AllureTest, getParentsArray, parseAllure } from 'allure-js-parser';
import { readFileSync } from 'fs';
import { extname } from '../../../../src/common';
import {
  beforeStr,
  suiteStr,
  testStr,
  visitHtmlStr,
} from '../../../cy-helper/test-compose';

describe('test screenshot when fail', () => {
  const res = createResTest2(
    [
      suiteStr('test screenshot', [
        beforeStr([visitHtmlStr, 'cy.get("div").should("exist");']),
        testStr('test fail', ['cy.log("hello")']),
        testStr('test fail 2', ['cy.log("hello")']),
      ]),
    ],
    {
      allureAddVideoOnPass: 'false',
    },
  );

  describe('check results', () => {
    let results: AllureTest[];

    beforeAll(() => {
      results = parseAllure(res.watch);
    });

    it('check cypress results', () => {
      checkCyResults(res?.result?.res, {
        totalPassed: 0,
        totalFailed: 1,
        totalSkipped: 1,
        totalTests: 2,
      });
    });

    it('check test with screenshot', async () => {
      const test = results.find(t => t.name === 'test fail');
      expect(test).toBeDefined();
      expect({
        status: test!.status,
        /*parents: getParentsArray(test).map(t => ({
          befores: t.befores?.map(z =>
            mapSteps(z.steps, x => ({
              name: x.name,
              attach: x.attachments,
              status: x.status,
            })),
          ),
        })),*/
        attach: test!.attachments.map(t => ({
          ...t,
          name: t.name.replace(/\d{3,}/g, 'number'),
          source: `source${extname(t.source)}`,
          length:
            readFileSync(`${res.watch}/${t.source}`).toString().length > 0,
        })),
      }).toEqual({
        attach: [
          {
            length: true,
            name: 'test screenshot -- test fail -- before all hook (failed).png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            length: true,
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        status: 'failed',
      });
    });

    it('check test with screenshot (second)', async () => {
      const test = results.find(t => t.name === 'test fail 2');
      expect(test).toBeDefined();
      expect({
        status: test!.status,
        attach: test!.attachments.map(t => ({
          ...t,
          name: t.name.replace(/\d{3,}/g, 'number'),
          source: `source${extname(t.source)}`,
          length:
            readFileSync(`${res.watch}/${t.source}`).toString().length > 0,
        })),
      }).toEqual({
        attach: [
          // cannot attach to unknown yet, todo
          // {
          //   length: true,
          //   name: 'test screenshot -- test fail -- before all hook (failed).png',
          //   source: 'source.png',
          //   type: 'image/png',
          // },
          {
            length: true,
            name: 'test_0_number.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        status: 'unknown',
      });
    });
  });
});
