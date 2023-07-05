// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-namespace
declare namespace Cypress {
  export type Status = 'passed' | 'failed' | 'skipped' | 'broken' | 'unknown';
  export type StatusDetails = import('allure-js-commons').StatusDetails;
  export type ContentType = import('../plugins/allure-types').ContentType;
  type LinkType = 'issue' | 'tms';
  type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
  type Parameter = { name: string; value: string };

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Chainable {
    allure(): Allure;
  }

  interface Cypress {
    /**
     * Interface via Cypress global object
     */
    Allure: AllureReporter<void>;
  }

  type Allure = AllureReporter<Allure>;

  interface AllureReporter<T> {
    tag(...tags: string[]): T;
    label(name: string, value: string): T;
    startStep(name: string): T;
    endStep(): T;
    step(name: string): T;
    severity(level: Severity): T;
    thread(value: string): T;
    fullName(value: string): T;
    testStatus(result: Status, details?: StatusDetails): T;
    testAttachment(name: string, content: Buffer | string, type: ContentType): T;
    testFileAttachment(name: string, file: string, type: ContentType): T;
    attachment(name: string, content: Buffer | string, type: ContentType): T;
    owner(value: string): T;
    lead(value: string): T;
    host(value: string): T;
    epic(value: string): T;
    link(url: string, name?: string, type?: LinkType): T;
    feature(value: string): T;
    story(value: string): T;
    allureId(value: string): T;
    language(value: string): T;
    parameter(name: string, value: string): T;
    parameters(...params: Parameter[]): T;
    testParameter(name: string, value: string): T;
    addDescriptionHtml(value: string): T;
  }
}
