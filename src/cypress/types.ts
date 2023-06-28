// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-namespace
declare namespace Cypress {
  export type Status = 'passed' | 'failed' | 'skipped' | 'broken';

  type TestEnd = {
    specStarted: { spec: Cypress.Spec };
    testEnded: { result: Status };
    testStarted: { title: string; fullTitle: string; id: string };
    suiteStarted: { title: string; fullTitle: string };
    suiteEnded: { no: string };
    stepEnded: { status: string; date?: number; details?: string };
    stepStarted: { name: string; date?: number };
    step: { name: string; status?: string; date?: number };
    setLabel: { name: string; value: string };
    message: { name: string };
    screenshot: { path: string };
    video: { path: string };
    allLogs: { allLogs: any[]; spec: Cypress.Spec };
  };

  export type RequestTask = keyof TestEnd;
  export type AllureTaskArgs<T extends RequestTask> = TestEnd[T];

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Chainable {
    /**
     * Custom command for logging
     * @param message - message
     */
    myLog(message: string): Chainable<void>; // todo remove

    allure<T extends RequestTask>(opts: { task: T; arg: AllureTaskArgs<T> }): Promise<null>;
  }
}
