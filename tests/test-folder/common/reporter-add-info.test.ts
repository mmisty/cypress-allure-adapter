import { existsSync, rmSync } from 'fs';
import { readWithRetry } from '@test-utils';
import type { ReporterOptions } from '@src/plugins/allure';
import { AllureTasks, Status } from '@src/plugins/allure-types';

describe('reporter - add env info', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const allureTasks = require('../../../src/plugins/allure').allureTasks;
  const resultsPath = 'allure-results-jest';
  const resultsPathWatch = `${resultsPath}/watch`;
  let reporter: AllureTasks;

  const opts: ReporterOptions = {
    allureAddVideoOnPass: false,
    allureSkipSteps: '',
    allureResults: resultsPath,
    techAllureResults: resultsPathWatch,
    videos: 'vid',
    screenshots: 'scr',
    showDuplicateWarn: false,
    isTest: false,
  };

  beforeEach(() => {
    reporter = allureTasks(opts);

    if (existsSync(resultsPath)) {
      rmSync(resultsPath, { recursive: true });
    }
  });

  it('should add additional env info', async () => {
    reporter.writeEnvironmentInfo({ info: { app: '1' } });
    reporter.specStarted({
      spec: {
        name: 'spec name',
        absolute: `${process.cwd()}/integration/e2e/spec name`,
        relative: 'path',
      },
    });
    reporter.suiteStarted({
      title: 'ROOT',
      fullTitle: 'ROOT',
    });
    reporter.hookStarted({ title: '"before all" hook', hookId: '1' });
    reporter.addEnvironmentInfo({ info: { version: '1.2.3' } });
    reporter.hookEnded({
      title: '"before all" hook',
      result: 'passed' as Status,
    });

    reporter.suiteEnded({});
    await reporter.afterSpec({ results: { spec: { relative: '123' } } } as any);
    await reporter.taskManager.flushAllTasks();

    expect(
      existsSync(`${opts.techAllureResults}/environment.properties`),
    ).toEqual(true);
    expect(
      readWithRetry(
        `${opts.techAllureResults}/environment.properties`,
      ).toString(),
    ).toEqual('app = 1\nversion = 1.2.3');
  });

  it('should not override existing env info with diff values', async () => {
    reporter.writeEnvironmentInfo({ info: { version: '1.3.4' } });
    reporter.specStarted({
      spec: {
        name: 'spec name',
        absolute: `${process.cwd()}/integration/e2e/spec name`,
        relative: 'path',
      },
    });
    reporter.suiteStarted({
      title: 'ROOT',
      fullTitle: 'ROOT',
    });
    reporter.hookStarted({ title: '"before all" hook', hookId: '1' });
    reporter.addEnvironmentInfo({
      info: { version: '1.2.3', otherThing: 'hello and more' },
    });
    reporter.hookEnded({
      title: '"before all" hook',
      result: 'passed' as Status,
    });

    reporter.suiteEnded({});
    await reporter.afterSpec({ results: { spec: { relative: '123' } } } as any);
    await reporter.taskManager.flushAllTasks();

    expect(
      existsSync(`${opts.techAllureResults}/environment.properties`),
    ).toEqual(true);
    expect(
      readWithRetry(
        `${opts.techAllureResults}/environment.properties`,
      ).toString(),
    ).toEqual('version = 1.2.3,1.3.4\notherThing = hello and more');
  });

  it('should not duplcate existing env info when the same value', async () => {
    reporter.writeEnvironmentInfo({
      info: { version: '1.3.4', otherThing: 'hello and more' },
    });
    reporter.specStarted({
      spec: {
        name: 'spec name',
        absolute: `${process.cwd()}/integration/e2e/spec name`,
        relative: 'path',
      },
    });
    reporter.suiteStarted({
      title: 'ROOT',
      fullTitle: 'ROOT',
    });
    reporter.hookStarted({ title: '"before all" hook', hookId: '1' });
    reporter.addEnvironmentInfo({ info: { version: '1.3.4' } });
    reporter.hookEnded({
      title: '"before all" hook',
      result: 'passed' as Status,
    });

    reporter.suiteEnded({});
    await reporter.afterSpec({ results: { spec: { relative: '123' } } } as any);
    await reporter.taskManager.flushAllTasks();

    expect(
      existsSync(`${opts.techAllureResults}/environment.properties`),
    ).toEqual(true);
    expect(
      readWithRetry(
        `${opts.techAllureResults}/environment.properties`,
      ).toString(),
    ).toEqual('version = 1.3.4\notherThing = hello and more');
  });

  it('should add several times', async () => {
    reporter.specStarted({
      spec: {
        name: 'spec name',
        absolute: `${process.cwd()}/integration/e2e/spec name`,
        relative: 'path',
      },
    });
    reporter.suiteStarted({
      title: 'ROOT',
      fullTitle: 'ROOT',
    });
    reporter.hookStarted({ title: '"before all" hook', hookId: '1' });
    reporter.addEnvironmentInfo({ info: { version: '1.3.4' } });
    reporter.addEnvironmentInfo({ info: { version: '1.3.5' } });
    reporter.hookEnded({
      title: '"before all" hook',
      result: 'passed' as Status,
    });

    reporter.suiteEnded({});
    await reporter.afterSpec({ results: { spec: { relative: '123' } } } as any);
    await reporter.taskManager.flushAllTasks();

    expect(
      existsSync(`${opts.techAllureResults}/environment.properties`),
    ).toEqual(true);
    expect(
      readWithRetry(
        `${opts.techAllureResults}/environment.properties`,
      ).toString(),
    ).toEqual('version = 1.3.5,1.3.4');
  });
});
