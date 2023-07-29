// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-namespace
declare namespace Cypress {
  export type Status = 'passed' | 'failed' | 'skipped' | 'broken' | 'unknown';
  export type CommandT = {
    state?: string;
    attributes?: { name?: string; args?: any; logs?: { attributes?: { consoleProps?: () => any } }[] };
  };
  export type StatusDetails = import('allure-js-commons').StatusDetails;
  export type Category = import('../plugins/allure-types').Category;
  export type ContentType = import('../plugins/allure-types').ContentType;
  export type EnvironmentInfo = import('../plugins/allure-types').EnvironmentInfo;
  export type ExecutorInfo = import('../plugins/allure-types').ExecutorInfo;
  type LinkType = 'issue' | 'tms';
  type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
  type Parameter = { name: string; value: string };

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Chainable {
    allure(): Allure;
  }
  interface AllureEvents {
    /**
     * This is handler for adding allure meta info after test is started
     * @param event 'test:started'
     * @param handler  - handler to add allure meta info
     * @example
     * // can be added into support file
     * Cypress.Allure.on('test:started', test => {
     *     Cypress.Allure.label('tag', 'started');
     *     Cypress.Allure.step('first step');
     *     console.log('AFTER TEST STARTED');
     * });
     */
    on(event: 'test:started', handler: (test: Mocha.Test) => void): void;

    /**
     * This is handler for adding allure meta info before test is ended
     * @param event 'test:ended'
     * @param handler  - handler to add allure meta info
     * @example
     * // can be added into support file
     * Cypress.Allure.on('test:ended', test => {
     *     Cypress.Allure.label('tag', 'started');
     *     Cypress.Allure.step('first step');
     *     console.log('AFTER TEST STARTED');
     * });
     */
    on(event: 'test:ended', handler: (test: Mocha.Test) => void): void;

    /**
     * Fired when command is really finished (mostly applicable for custom commands)
     * @param event
     * @param handler
     */
    on(event: 'cmd:ended', handler: (cmd: CommandT, isCustom?: boolean) => void): void;
    /**
     * Fired when command is started (mostly applicable for custom commands)
     * @param event
     * @param handler
     */
    on(event: 'cmd:started', handler: (cmd: CommandT) => void): void;
  }

  interface Cypress {
    /**
     * Interface via Cypress global object
     */
    Allure: AllureReporter<void> & AllureEvents;
  }

  type Allure = AllureReporter<Allure>;

  interface AllureReporter<T> {
    /**
     * Adds label to test result
     * @param name - label name
     * @param value - label value
     * @example
     * cy.allure().label('tag', '@P1');
     */
    label(name: string, value: string): T;

    /**
     * Starts step
     * @param name - step name
     * @example
     * cy.allure().startStep('should login');
     */
    startStep(name: string): T;

    /**
     * Ends current step
     * @example
     * cy.allure().endStep();
     */
    endStep(status?: Status): T;
    mergeStepMaybe(name: string): T;

    /**
     * Created finished step
     * @example
     * cy.allure().step('should login');
     */
    step(name: string): T;

    /**
     * Adds tags to test
     * @param tags
     * @example
     * cy.allure().tag('@regression', '@P1');
     */
    tag(...tags: string[]): T;

    /**
     * Adds severity to test
     * @param level 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
     * @example
     * cy.allure().severity('blocker');
     */
    severity(level: Severity): T;

    /**
     * Adds thread to test
     * @param value string to group in timeline
     * @example
     * cy.allure().thread('01');
     */
    thread(value: string): T;

    /**
     * Sets test full name
     * @param value string to group in timeline
     * @example
     * cy.allure().fullName('authentication: should login');
     */
    fullName(value: string): T;

    /**
     * Sets label 'owner' - will be shown in allure report as Owner field
     * @param value owner name
     * @example
     * cy.allure().owner('TP');
     */
    owner(value: string): T;

    /**
     * Sets label 'lead'
     * @param value lead name
     * @example
     * cy.allure().lead('TP');
     */
    lead(value: string): T;

    /**
     * Sets label 'host'
     * @param value host name
     * @example
     * cy.allure().host('MAC-01');
     */
    host(value: string): T;

    /**
     * Sets label 'layer'
     * @param value layer name
     * @example
     * cy.allure().host('MAC-01');
     */
    layer(value: string): T;

    /**
     * Sets label 'browser'
     * @param value layer name
     * @example
     * cy.allure().browser('chrome');
     */
    browser(value: string): T;

    /**
     * Sets label 'device'
     * @param value layer name
     * @example
     * cy.allure().device('MAC-01');
     */
    device(value: string): T;

    /**
     * Sets label 'os'
     * @param value os name
     * @example
     * cy.allure().os('ubuntu');
     */
    os(value: string): T;

    epic(value: string): T;

    /**
     * Adds link with type tms or issue
     * @param url = full url
     * @param name = display text for URL in report
     * @example
     *  cy.allure().link('http://my.jira.com/ABD-123', 'ABD-123 description', 'issue');
     *  cy.allure().link('http://my.jira.com/ABD-123', 'ABD-123 description', 'tms');
     */
    link(url: string, name?: string, type?: LinkType): T;

    /**
     * Adds link to tms = has icon tms
     * @param urlOrId = full url or ID of item
     * @param name = display text for URL in report
     * @example
     *  cy.allure().tms('ABD-123');
     *  cy.allure().tms('http://my.jira.com/ABD-123', 'ABD-123 description');
     */
    tms(urlOrId: string, name?: string): T;

    /**
     * Adds link to defect = has icon BUG
     * @param urlOrId = full url or ID of item
     * @param name = display text for URL in report
     * @example
     *  cy.allure().issue('ABD-123');
     *  cy.allure().issue('http://my.jira.com/ABD-123', 'ABD-123 description');
     */
    issue(urlOrId: string, name?: string): T;

    feature(value: string): T;
    story(value: string): T;
    allureId(value: string): T;
    language(value: string): T;
    parameter(name: string, value: string): T;
    parameters(...params: Parameter[]): T;
    testParameter(name: string, value: string): T;

    /**
     * Sets test status. In some cases you may need to change test status
     * @param result - 'passed' | 'failed' | 'skipped' | 'broken' | 'unknown';
     * @param details - status details - optional
     * @param details.message - message that is shown in report for test
     * @param details.trace  - stack trace
     * @example
     * cy.allure().testStatus('broken', { message: 'review test' });
     */
    testStatus(result: Status, details?: StatusDetails): T;

    /**
     * Sets test details - In some cases you may need to change test details message
     * @param details - status details
     * @param details.message - message that is shown in report for test
     * @param details.trace  - stack trace
     * @example
     * cy.allure().testDetails({ message: 'review test' });
     */
    testDetails(details: StatusDetails): T;

    /**
     * Adds attachment to current test
     * @param name attachment name
     * @param content - contents of attachmnet
     * @param type - content type
     */
    testAttachment(name: string, content: Buffer | string, type: ContentType): T;

    /**
     * Adds file attachment to current test
     * @param name attachment name
     * @param file - path to file
     * @param type - content type
     */
    testFileAttachment(name: string, file: string, type: ContentType): T;

    /**
     * Adds attachment to current executable (step, hook or test)
     * @param name attachment name
     * @param content - contents of attachmnet
     * @param type - content type
     */
    attachment(name: string, content: Buffer | string, type: ContentType): T;

    /**
     * Adds file attachment to current executable (step, hook or test)
     * @param name attachment name
     * @param file - path to file
     * @param type - content type
     */
    fileAttachment(name: string, file: string, type: ContentType): T;

    /**
     * Add description HTML
     * Will concatenate all descriptions
     * @param value - html string
     * @example
     * cy.allure().addDescriptionHtml('<b>description</b>')
     */
    addDescriptionHtml(value: string): T;

    /**
     * Writes environment info file into allure results path
     * @param info - dictionary
     * @example
     * cy.allure().writeEnvironmentInfo({
     *    OS: 'ubuntu',
     *    commit: 'fix of defect 1'
     * })
     */
    writeEnvironmentInfo(info: EnvironmentInfo): T;

    /**
     * Writes executor info file into allure results path
     * @param info - dictionary
     * @example
     *  cy.allure().writeExecutorInfo({
     *       name: '1',
     *       type: 'wwew',
     *       url: 'http://build',
     *       buildOrder: 1,
     *       buildName: 'build name',
     *       buildUrl: 'http://build.url',
     *       reportUrl: 'http://report/1',
     *       reportName: 'report 1',
     *     });
     */
    writeExecutorInfo(info: ExecutorInfo): T;

    /**
     * Writes categories definitions file into allure results path
     * @param categories - Categories to write
     */
    writeCategoriesDefinitions(categories: Category[]): T;

    /**
     * Delete allure-results
     */
    deleteResults(): T;
  }
}
