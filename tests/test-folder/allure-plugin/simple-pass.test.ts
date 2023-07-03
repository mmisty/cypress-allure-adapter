import { parseAllure } from 'allure-js-parser';
import { ExecutableItem } from 'allure-js-commons';
import path from 'path';
import { createResTest } from '../../cy-helper/utils';

jest.setTimeout(70000);

describe.skip('run one test', () => {
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
            name: 'one -- two -- test pass (failed)1687901471026.png',
            source: 'source.png',
            type: 'image/png',
          },
          {
            name: 'one.cy.ts.mp4',
            source: 'source.mp4',
            type: 'video/mp4',
          },
        ],
        fullName: 'suite with one test test pass',
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
        ],
        links: [],
        name: 'test pass',
        parameters: [],
        parent: {
          afters: [],
          befores: [],
          name: 'suite with one test',
          uuid: 'no',
        },
        stage: 'pending',
        start: 1323460800000,
        status: 'passed',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: 'task: log, Registered allureAdapterSetup',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
              {
                attachments: [],
                name: 'task: log, Registered allureAdapterSetup',
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
            name: 'intercept: mytest.com**, [object Object]',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
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
            ],
            stop: 1323460800011,
          },
          {
            attachments: [],
            name: 'visit: mytest.com, [object Object]',
            parameters: [],
            stage: 'pending',
            start: 1323460800000,
            status: 'passed',
            statusDetails: {},
            steps: [
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
            ],
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
                name: 'get: div',
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
            steps: [
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
            ],
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
            steps: [
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
            stop: 1323460800011,
          },
        ],
        stop: 1323460800010,
        uuid: 'no',
      },
    ]);
  });
});
