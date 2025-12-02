// Type declarations for allure-js-commons/sdk/reporter
declare module 'allure-js-commons/sdk/reporter' {
  import type {
    AttachmentOptions,
    FixtureResult,
    Label,
    StepResult,
    TestResult,
    TestResultContainer,
  } from 'allure-js-commons';

  export interface Category {
    name?: string;
    description?: string;
    descriptionHtml?: string;
    messageRegex?: string | RegExp;
    traceRegex?: string | RegExp;
    matchedStatuses?: string[];
    flaky?: boolean;
  }

  export type EnvironmentInfo = Record<string, string | undefined>;

  export interface Writer {
    writeResult(result: TestResult): void;
    writeGroup(result: TestResultContainer): void;
    writeAttachment(distFileName: string, content: Buffer): void;
    writeAttachmentFromPath(distFileName: string, from: string): void;
    writeEnvironmentInfo(info: EnvironmentInfo): void;
    writeCategoriesDefinitions(categories: Category[]): void;
  }

  export type FixtureType = 'before' | 'after';

  export interface ReporterRuntimeConfig {
    readonly writer: Writer;
    readonly links?: Record<string, unknown>;
    readonly globalLabels?: Label[] | Record<string, string | string[]>;
    readonly listeners?: unknown[];
    readonly environmentInfo?: EnvironmentInfo;
    readonly categories?: Category[];
  }

  export class FileSystemWriter implements Writer {
    constructor(config: { resultsDir: string });
    writeResult(result: TestResult): void;
    writeGroup(result: TestResultContainer): void;
    writeAttachment(distFileName: string, content: Buffer): void;
    writeAttachmentFromPath(distFileName: string, from: string): void;
    writeEnvironmentInfo(info: EnvironmentInfo): void;
    writeCategoriesDefinitions(categories: Category[]): void;
  }

  export class ReporterRuntime {
    writer: Writer;
    categories?: Category[];
    environmentInfo?: EnvironmentInfo;
    globalLabels: Label[];

    constructor(config: ReporterRuntimeConfig);

    startScope(): string;
    updateScope(uuid: string, updateFunc: (scope: unknown) => void): void;
    writeScope(uuid: string): void;

    startFixture(scopeUuid: string, type: FixtureType, fixtureResult: Partial<FixtureResult>): string | undefined;
    updateFixture(uuid: string, updateFunc: (result: FixtureResult) => void): void;
    stopFixture(uuid: string, opts?: { stop?: number; duration?: number }): void;

    startTest(result: Partial<TestResult>, scopeUuids?: string[]): string;
    updateTest(uuid: string, updateFunc: (result: TestResult) => void): void;
    stopTest(uuid: string, opts?: { stop?: number; duration?: number }): void;
    writeTest(uuid: string): void;

    currentStep(rootUuid: string): string | undefined;
    startStep(
      rootUuid: string,
      parentStepUuid: string | null | undefined,
      result: Partial<StepResult>,
    ): string | undefined;
    updateStep(uuid: string, updateFunc: (stepResult: StepResult) => void): void;
    stopStep(uuid: string, opts?: { stop?: number; duration?: number }): void;

    writeAttachment(
      rootUuid: string,
      parentStepUuid: string | null | undefined,
      attachmentName: string,
      attachmentContentOrPath: Buffer | string,
      options: AttachmentOptions & { wrapInStep?: boolean; timestamp?: number },
    ): void;

    writeEnvironmentInfo(): void;
    writeCategoriesDefinitions(): void;
  }
}
