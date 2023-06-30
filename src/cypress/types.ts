// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-namespace
declare namespace Cypress {
  export type Status = 'passed' | 'failed' | 'skipped' | 'broken' | 'unknown';
  export type StatusDetails = import('allure-js-commons').StatusDetails;
  export type AutoScreen = {
    screenshotId: string;
    testId: string;
    testAttemptIndex: number;
    takenAt: string; // date
    path: string; // abs path
    height: number;
    width: number;
  };

  type TestEnd = {
    specStarted: { spec: Cypress.Spec };
    testEnded: { result: Status; details?: StatusDetails };
    testStarted: { title: string; fullTitle: string; id: string };
    suiteStarted: { title: string; fullTitle: string; file?: string };
    currentSpec: { spec: Cypress.Spec };
    suiteEnded: undefined;
    stepEnded: { status: string; date?: number; details?: StatusDetails };
    // stepEndedAll: { status: string; date?: number; details?: StatusDetails };
    stepStarted: { name: string; date?: number };
    step: { name: string; status?: string; date?: number };
    setLabel: { name: string; value: string };
    message: { name: string };
    attachScreenshots: { screenshots: AutoScreen[] };
    screenshotOne: { name: string; forStep?: boolean };
    video: { path: string };
    // allLogs: { allLogs: any[]; spec: Cypress.Spec };
    attachVideoToTests: { path: string };
    eventEnd: undefined;
    testResult: { result: string };
    endAll: undefined;
  };

  export type RequestTask = keyof TestEnd;
  export type AllureTaskArgs<T extends RequestTask> = TestEnd[T] extends undefined
    ? {
        // ign
      }
    : TestEnd[T];

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Chainable {
    /**
     * Custom command for logging
     * @param message - message
     */
    myLog(message: string): Chainable<void>; // todo remove

    allure<T extends RequestTask>(
      opts: { task: T; arg: AllureTaskArgs<T> },
      cyOpts?: { log: boolean },
    ): Chainable<null>;
  }
}
