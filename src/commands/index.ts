import Chainable = Cypress.Chainable;
import AllureReporter = Cypress.AllureReporter;

export const registerCommands = () => {
  Cypress.Commands.add('allure', () => {
    const allure = Cypress.Allure;

    cy.wrap(allure, {
      log: false,
    });
  });

  type Commands = {
    [key in keyof AllureReporter<unknown>]: (
      allure: AllureReporter<unknown>,
      ...args: Parameters<AllureReporter<unknown>[key]>
    ) => void;
  };

  const childCommands: Commands = {
    parameter: (allure, name, value) => allure.parameter(name, value),
    parameters: (allure, ...params) => allure.parameters(...params),
    testParameter: (allure, name, value) => allure.testParameter(name, value),
    addDescriptionHtml: (allure, value) => allure.addDescriptionHtml(value),
    //testName: (allure, name) => allure.testName(name),
    host: (allure, value) => allure.host(value),
    language: (allure, value) => allure.language(value),
    severity: (allure, value) => allure.severity(value),
    epic: (allure, value) => allure.epic(value),
    feature: (allure, value) => allure.feature(value),
    link: (allure, value, name, type) => allure.link(value, name, type),
    story: (allure, value) => allure.story(value),
    thread: (allure, value) => allure.thread(value),
    allureId: (allure, value) => allure.allureId(value),
    //  testID: (allure, id) => allure.label('AS_ID', id),
    testAttachment: (allure, name, content, type) => allure.testAttachment(name, content, type),
    testFileAttachment: (allure, name, file, type) => allure.testFileAttachment(name, file, type),
    attachment: (allure, name, content, type) => allure.attachment(name, content, type),
    owner: (allure, name) => allure.owner(name),
    fullName: (allure, name) => allure.fullName(name),
    lead: (allure, name) => allure.lead(name),
    // fileAttachment: (allure, name, path, type) => allure.fileAttachment(name, path, type),
    startStep: (allure, name) => allure.startStep(name),
    step: (allure, name) => allure.step(name),
    endStep: allure => allure.endStep(),
    //parentSuite: (allure, name) => allure.label('parentSuite', name),
    // suite: (allure, name) => allure.suite(name),
    // subSuite: (allure, name) => allure.label('subSuite', name),
    label: (allure, name, value) => allure.label(name, value),
    //issue: (allure, name, url) => {
    //  const issuePrefix = Cypress.env('issuePrefix');
    //   allure.issue(name, issuePrefix ? `${issuePrefix}${url}` : url);
    // },
    // tms: (allure, name, url) => {
    //  const tmsPrefix = Cypress.env('tmsPrefix');

    //  const pattern = tmsPrefix && tmsPrefix.includes('*') ? tmsPrefix : `${tmsPrefix}*`;
    //  allure.tms(name, tmsPrefix ? pattern.replace(/\*/g, url) : url);
    //},
    //description: (allure, markdown) => allure.description(markdown),
    tag: (allure, ...tags) => allure.tag(...tags),
    // writeEnvironmentInfo: (allure, info) => allure.writeEnvironmentInfo(info),
    //  writeExecutorInfo: (allure, info) => allure.writeExecutorInfo(info),
    //  writeCategoriesDefinitions: (allure, categories) => allure.writeCategoriesDefinitions(categories),
  };

  for (const command in childCommands) {
    const cmd = command as keyof Chainable<any>;

    Cypress.Commands.add(cmd, { prevSubject: true }, (...args: any[]) => {
      const [allure, ...params] = args;
      childCommands[command as keyof AllureReporter<unknown>](allure, ...params);
      cy.wrap(allure, { log: false });
    });
  }
};
