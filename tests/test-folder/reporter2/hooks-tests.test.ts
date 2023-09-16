import { AllureReporter3 } from '../../../src/plugins/allure-reporter-3';
import { existsSync, rmSync } from 'fs';
import { Status } from '../../../src/plugins/allure-types';
import {
  parseAllureSorted,
  selectItems,
  selectMap,
} from '../../cy-helper/utils';
import { basename } from 'path';
import { AllureTest, getParentsArray } from 'allure-js-parser';

/**
 * This is simple test where one group with two tests created
 */
describe('several hooks', () => {
  const allureResults = `allure-results-reporter2/${basename(__filename)}`;
  let reporter: AllureReporter3;
  let res: AllureTest[];

  beforeEach(() => {
    if (existsSync(allureResults)) {
      rmSync(allureResults, { recursive: true });
    }
    reporter = new AllureReporter3({ allureResults });
  });

  beforeEach(() => {
    reporter.hookStarted({
      title: 'before all hook 0',
      hookId: '1',
      date: 100,
    });
    reporter.hookEnded({
      title: 'before all hook 0',
      result: Status.PASSED,
      date: 120,
    });
    reporter.startGroup({ title: 'Root one', fullTitle: 'any' });

    reporter.hookStarted({
      title: 'before all hook 1',
      hookId: '1',
      date: 100,
    });
    reporter.hookEnded({
      title: 'before all hook 1',
      result: Status.PASSED,
      date: 120,
    });

    reporter.startTest({
      title: 'Hello 1',
      id: '1',
      fullTitle: 'Hello 1',
      date: 100,
    });
    reporter.endTest({ result: Status.PASSED, date: 110 });

    reporter.startGroup({ title: 'Child', fullTitle: 'any' });

    reporter.startTest({
      title: 'Hello 2',
      id: '2',
      fullTitle: 'Hello 2',
      date: 100,
    });
    reporter.endTest({
      result: Status.FAILED,
      details: { message: 'ERROR IN TEST' },
      date: 110,
    });
    reporter.endGroup();
    reporter.endGroup();
    res = parseAllureSorted(allureResults);
  });

  it('check names', () => {
    expect(selectMap(res, 'name', 'fullName')).toEqual([
      { fullName: 'Hello 1', name: 'Hello 1' },
      { fullName: 'Hello 2', name: 'Hello 2' },
    ]);
  });

  it('check status, statusDetails, stage', () => {
    expect(selectMap(res, 'name', 'status', 'statusDetails', 'stage')).toEqual([
      {
        name: 'Hello 1',
        status: 'passed',
        stage: 'finished',
        statusDetails: {},
      },
      {
        name: 'Hello 2',
        status: 'failed',
        stage: 'finished',
        statusDetails: {
          message: 'ERROR IN TEST',
        },
      },
    ]);
  });

  it('check no steps', () => {
    expect(selectMap(res, 'name', 'steps')).toEqual([
      { name: 'Hello 1', steps: [] },
      { name: 'Hello 2', steps: [] },
    ]);
  });

  it('check no attachments', () => {
    expect(selectMap(res, 'name', 'attachments')).toEqual([
      { name: 'Hello 1', attachments: [] },
      { name: 'Hello 2', attachments: [] },
    ]);
  });

  it('check no links', () => {
    expect(selectMap(res, 'name', 'links')).toEqual([
      { name: 'Hello 1', links: [] },
      { name: 'Hello 2', links: [] },
    ]);
  });

  it('check no parameters', () => {
    expect(selectMap(res, 'name', 'parameters')).toEqual([
      { name: 'Hello 1', parameters: [] },
      { name: 'Hello 2', parameters: [] },
    ]);
  });

  it('check historyIds', () => {
    const id = selectMap(res, 'name', 'historyId');
    expect(id[0].historyId).toMatch(/[\d\w-]+/);
    expect(id[1].historyId).toMatch(/[\d\w-]+/);
    expect(id[0].historyId).not.toEqual(id[1].historyId);
  });

  it('check uuid', () => {
    const uid = selectMap(res, 'name', 'uuid');
    expect(uid[0].uuid).toMatch(/[\d\w-]+/);
    expect(uid[1].uuid).toMatch(/[\d\w-]+/);
    expect(uid[0].uuid).not.toEqual(uid[1].uuid);
  });

  it('check start stop', () => {
    const tests = selectMap(res, 'name', 'start', 'stop');
    const time1 = tests[0].stop - tests[0].start;
    const time2 = tests[1].stop - tests[1].start;
    expect(time1).toEqual(10);
    expect(time2).toEqual(10);
  });

  it('check parent', () => {
    const tests = selectMap(res, 'name', 'parent').map(t => ({
      ...t,
      parent: getParentsArray(t).map(selectItems('name', 'befores', 'afters')),
    }));

    expect(tests).toEqual([
      {
        name: 'Hello 1',
        parent: [
          {
            afters: [],
            befores: [
              {
                attachments: [],
                name: 'before all hook 0',
                parameters: [],
                stage: 'finished',
                start: 100,
                stop: 120,
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
              {
                attachments: [],
                name: 'before all hook 1',
                parameters: [],
                stage: 'finished',
                start: 100,
                stop: 120,
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
            ],
            name: 'Root one',
          },
        ],
      },
      {
        name: 'Hello 2',
        parent: [
          {
            afters: [],
            befores: [
              {
                attachments: [],
                name: 'before all hook 0',
                parameters: [],
                stage: 'finished',
                start: 100,
                stop: 120,
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
              {
                attachments: [],
                name: 'before all hook 1',
                parameters: [],
                stage: 'finished',
                start: 100,
                stop: 120,
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
            ],
            name: 'Child',
          },
          {
            afters: [],
            befores: [
              {
                attachments: [],
                name: 'before all hook 0',
                parameters: [],
                stage: 'finished',
                start: 100,
                stop: 120,
                status: 'passed',
                statusDetails: {},
                steps: [],
              },
              {
                attachments: [],
                parameters: [],
                name: 'before all hook 1',
                stage: 'finished',
                start: 100,
                status: 'passed',
                statusDetails: {},
                steps: [],
                stop: 120,
              },
            ],
            name: 'Root one',
          },
        ],
      },
    ]);
  });

  it('check no description/descriptionHtml', () => {
    expect(selectMap(res, 'name', 'description', 'descriptionHtml')).toEqual([
      { name: 'Hello 1' },
      { name: 'Hello 2' },
    ]);
  });

  it('check labels', () => {
    expect(selectMap(res, 'name', 'labels')).toEqual([
      {
        labels: ['parentSuite: "Root one"'],
        name: 'Hello 1',
      },
      {
        labels: ['parentSuite: "Root one"', 'suite: "Child"'],
        name: 'Hello 2',
      },
    ]);
  });
});
