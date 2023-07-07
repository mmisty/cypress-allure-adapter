import { Status } from 'allure-js-commons';

describe('envinfo', () => {
  it('test', () => {
    cy.allure().writeEnvironmentInfo(Cypress.env());

    // todo categories to work
    cy.allure().writeCategoriesDefinitions([
      {
        name: '123',
        description: '34656',
        descriptionHtml: '',
        messageRegex: 'timeout',
        matchedStatuses: ['failed' as Status],
      },
    ]);

    cy.allure().writeExecutorInfo({
      name: '1',
      type: 'wwew',
      url: 'http://sdad',
      buildOrder: 1,
      buildName: ' build name',
      buildUrl: 'http://sdad',
      reportUrl: 'http://sdad',
      reportName: 'http://sdad',
    });

    cy.wrap(null).then(() => {
      throw new Error('Hello timeout');
    });
  });
});
