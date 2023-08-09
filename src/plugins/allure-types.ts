import type { StatusDetails } from 'allure-js-commons';
import type { ContentType } from '../common/types';

export interface AutoScreen {
  screenshotId: string;
  testId: string;
  testAttemptIndex: number;
  takenAt: string; // date
  path: string; // abs path
  height: number;
  width: number;
}

export type LinkType = 'issue' | 'tms';

type AllureTask = {
  specStarted: { spec: Cypress.Spec };
  writeEnvironmentInfo: { info: EnvironmentInfo };
  writeExecutorInfo: { info: ExecutorInfo };
  writeCategoriesDefinitions: { categories: Category[] | string };
  testEnded: { result: Status; details?: StatusDetails };
  testStarted: { title: string; fullTitle: string; id: string; currentRetry?: number };
  suiteStarted: { title: string; fullTitle: string; file?: string };
  hookStarted: { title: string; file?: string; hookId?: string; date?: number };
  hookEnded: { title: string; date?: number; result: Status; details?: StatusDetails };
  // currentSpec: { spec: Cypress.Spec };
  suiteEnded: undefined;
  // flushWatcher: undefined;
  deleteResults: undefined;
  // globalHook: undefined;
  stepEnded: { status: Status; date?: number; details?: StatusDetails };
  mergeStepMaybe: { name: string };
  // stepEndedAll: { status: string; date?: number; details?: StatusDetails };
  stepStarted: { name: string; date?: number };
  step: { name: string; status?: string; date?: number };
  parameter: { name: string; value: string };
  fullName: { value: string };
  link: { url: string; name?: string; type?: LinkType };
  testParameter: { name: string; value: string };
  testStatus: { result: Status; details?: StatusDetails };
  testDetails: { details?: StatusDetails };
  testAttachment: { name: string; content: string | Buffer; type: string };
  testFileAttachment: { name: string; file: string; type: ContentType };
  fileAttachment: { name: string; file: string; type: ContentType };
  attachment: { name: string; content: string | Buffer; type: string };
  addDescriptionHtml: { value: string };
  label: { name: string; value: string };
  message: { name: string };
  testMessage: { path: string; message: string };
  delete: { path: string };
  attachScreenshots: { screenshots: AutoScreen[] };
  screenshotOne: { name: string; forStep?: boolean };
  attachVideoToTests: { path: string };
  testResult: {
    title: string;
    id: string;
    result: Status;
    details?: StatusDetails;
  };
  endAll: undefined;
  afterSpec: { results: CypressCommandLine.RunResult };
};

export type RequestTask = keyof AllureTask;
export type AllureTaskArgs<T extends RequestTask> = AllureTask[T] extends undefined
  ? {
      // ign
    }
  : AllureTask[T];
export type AllureTasks = { [key in RequestTask]: (args: AllureTaskArgs<key>) => void | Promise<void> };
export type AllureTransfer<T extends RequestTask> = { task: T; arg: AllureTaskArgs<T> };

export enum Status {
  PASSED = 'passed',
  FAILED = 'failed',
  BROKEN = 'broken',
  SKIPPED = 'skipped',
}

export enum Stage {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  FINISHED = 'finished',
  PENDING = 'pending',
  INTERRUPTED = 'interrupted',
}

export enum LabelName {
  ALLURE_ID = 'ALLURE_ID',
  AS_ID = 'ALLURE_ID',
  SUITE = 'suite',
  PARENT_SUITE = 'parentSuite',
  SUB_SUITE = 'subSuite',
  EPIC = 'epic',
  FEATURE = 'feature',
  STORY = 'story',
  SEVERITY = 'severity',
  TAG = 'tag',
  OWNER = 'owner',
  LEAD = 'lead',
  HOST = 'host',
  THREAD = 'thread',
  TEST_METHOD = 'testMethod',
  TEST_CLASS = 'testClass',
  PACKAGE = 'package',
  FRAMEWORK = 'framework',
  LANGUAGE = 'language',
  LAYER = 'layer',
}

type KeysStage = keyof typeof Stage;
export type StageType = (typeof Stage)[KeysStage];

type KeysStatus = keyof typeof Status;
export type StatusType = (typeof Status)[KeysStatus];

export const UNKNOWN = 'unknown' as Status;

export type ExecutorInfo = {
  name?: string;
  type?: string;
  url?: string;
  buildOrder?: number;
  buildName?: string;
  buildUrl?: string;
  reportUrl?: string;
  reportName?: string;
};

export interface Category {
  name?: string;
  description?: string;
  descriptionHtml?: string;
  messageRegex?: string;
  traceRegex?: string;
  matchedStatuses?: Status[];
  flaky?: boolean;
}
export type EnvironmentInfo = Record<string, string>;
