import { parseAllure } from 'allure-js-parser';
import { ExecutableItem } from 'allure-js-commons';
import { createResTest } from '../../cy-helper/utils';

jest.setTimeout(70000);

describe.skip('run one test', () => {
  const storeResDir = createResTest(__filename);

  it(`check ${storeResDir}`, async () => {
    const storeResDir = 'allure-results/one.cy.ts';
    const results = parseAllure(storeResDir);
    const date = Date.parse('10 Dec 2011');

    const replaceSteps = (steps: ExecutableItem[]): any[] => {
      if (steps.length === 0) {
        return [];
      }

      return steps.map(s => ({ ...s, start: date, stop: date + 11, steps: replaceSteps(s.steps) }));
    };

    const resFixed = results.map(r => {
      return {
        ...r,
        historyId: 'no',
        uuid: 'no',
        start: date,
        stop: date + 10,
        parent: { ...r.parent, uuid: 'no' },
        steps: replaceSteps(r.steps),
      };
    });

    expect(resFixed).toEqual([
      {
        attachments: [],
        fullName: 'one two test pass',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'one.two',
          },
          {
            name: 'parentSuite',
            value: 'one',
          },
          {
            name: 'suite',
            value: 'two',
          },
        ],
        links: [],
        name: 'test pass',
        parameters: [],
        parent: {
          uuid: 'no',
        },
        stage: 'pending',
        start: 1323460800000,
        status: 'passed',
        statusDetails: {},
        stop: 1323460800010,
        uuid: 'no',
        steps: [
          {
            attachments: [],
            name: 'visit ["https://example.cypress.io/"]',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'get ["div"]',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            stop: 1323460800011,
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'task ["hello"]',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
          },
        ],
      },
    ]);
  });
});
