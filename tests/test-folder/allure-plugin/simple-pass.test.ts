import { parseAllure } from 'allure-js-parser';
import { ExecutableItem } from 'allure-js-commons';
import path from 'path';
import { createResTest } from '../../cy-helper/utils';

jest.setTimeout(70000);

describe('run one test', () => {
  const storeResDir = createResTest(__filename);

  it(`check ${storeResDir}`, async () => {
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
        attachments: r.attachments.map(t => ({ ...t, source: `source${path.extname(t.source)}` })),
      };
    });

    expect(resFixed).toEqual([
      {
        attachments: [
          {
            name: 'simple-pass.cy.ts',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        descriptionHtml: 'integration/e2e/simple-pass.cy.ts',
        fullName: 'suite with one test #2 test pass',
        historyId: 'no',
        labels: [
          {
            name: 'package',
            value: 'suite with one test',
          },
          {
            name: 'parentSuite',
            value: 'suite with one test',
          },
          {
            name: 'path',
            value: 'integration/e2e/simple-pass.cy.ts',
          },
        ],
        links: [],
        name: '#2 test pass',
        parameters: [],
        parent: {
          afters: [],
          befores: [],
          name: 'suite with one test',
          uuid: 'no',
        },
        stage: 'finished',
        start: 1323460800000,
        status: 'passed',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: '"before each" hook',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'log: log, Registered allureAdapterSetup',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'route: undefined',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'visit: mytest.com',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'get: div',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'assert: expected **[ <div>, 1 more... ]** to exist in the DOM',
                parameters: [],
                stage: 'pending',
                start: 1323460800000,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 1323460800011,
              },
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'myLog: log task',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'task: log, log task',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [],
            stop: 1323460800011,
          },
        ],
        stop: 1323460800010,
        uuid: 'no',
      },
    ]);
  });
});
