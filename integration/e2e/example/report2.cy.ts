import { Status } from '@src/plugins/allure-types';

describe(
  'calculator @example',
  {
    env: {
      allureSkipCommands: 'wrap',
    },
  },
  () => {
    Cypress.Allure.on('test:started', test => {
      Cypress.Allure.writeEnvironmentInfo({
        allure: Cypress.env('allure'),
        allureResults: Cypress.env('allureResults'),
        allureSkipCommands: Cypress.env('allureSkipCommands'),
        tmsPrefix: Cypress.env('tmsPrefix'),
        issuePrefix: Cypress.env('issuePrefix'),
      });

      Cypress.Allure.writeExecutorInfo({
        name: '1',
        type: 'Jenkins',
        url: 'http://build',
        buildOrder: 1,
        buildName: 'build name',
        buildUrl: 'http://build.url',
        reportUrl: 'http://127.0.0.1:54066/',
        reportName: 'report 1',
      });

      Cypress.Allure.writeCategoriesDefinitions([
        {
          name: 'equality',
          matchedStatuses: ['failed' as Status],
          messageRegex: '.*expected \\d+ to equal \\d+.*',
          traceRegex: '.*',
        },
      ]);
      Cypress.Allure.language('javascript');
      Cypress.Allure.tag('@P1');
      Cypress.Allure.epic('Calculator');
      Cypress.Allure.feature('advanced mode');
      Cypress.Allure.host('MAC-2');

      if (test.title.indexOf('divide') !== -1) {
        Cypress.Allure.story('divide');
      }

      if (test.tags?.some(t => t.tag.indexOf('@nonImpl') !== -1)) {
        Cypress.Allure.testDetails({ message: 'skipped because this is not implemented yet' });
      }
    });

    before('Setup for tests in file', () => {
      cy.log('Setup for tests in file');
    });

    beforeEach('Test setup', () => {
      cy.log('Some setup step');
    });
    afterEach('Test teardown', () => {
      cy.log('Some teardown step');
    });

    after('Teardown for tests in file', () => {
      cy.log('Teardown for tests in file');
    });

    it('should start calc', () => {
      cy.allure().severity('blocker').owner('Maria').lead('Ivan Ivanov').thread('02');
    });

    describe('Summ - substract', () => {
      it('should summ values', () => {
        cy.allure()
          .story('sum')
          .severity('critical')
          .owner('Ivan Ivanov')
          .lead('Ivan Ivanov')
          .issue('TEAM-1')
          .addDescriptionHtml('<b>This test should check sum values</b>')
          .thread('01');

        cy.log('step 1');
        cy.log('step 2');
        cy.allure().startStep('summ');
        cy.allure().parameter('A', '1').parameter('B', '2');
        cy.wrap(1 + 2).should('eq', 3);
        cy.allure().endStep();
      });

      it('should subtract values', { defaultCommandTimeout: 1000, retries: 1 }, () => {
        cy.allure()
          .story('subtract')
          .severity('critical')
          .owner('Maria')
          .lead('Ivan Ivanov')
          .issue('DEFECT-1')
          .addDescriptionHtml('<b>This test should check values subtraction</b>')
          .thread('02');

        cy.log('step 1');
        cy.log('step 2');
        cy.allure().startStep('subtract');
        cy.allure().parameter('A', '1').parameter('B', '2');
        cy.wrap(2 - 1).should('eq', 3);
        cy.allure().endStep();
      });

      it('should subtract big values', () => {
        cy.allure().story('subtract').severity('critical').owner('Maria').lead('Ivan Ivanov').thread('02');

        cy.allure().parameter('A', '1000').parameter('B', '2000');
      });
    });

    describe('mult - divide', () => {
      it('should multiply values', { tags: '@nonImpl' }, function () {
        Cypress.Allure.story('multiply');
        Cypress.Allure.host('MAC-1');
        Cypress.Allure.addDescriptionHtml('<b>This test should check values multiplication</b>');

        this.skip();
      });

      it.skip('should divide values', () => {
        // not impl
      });
    });
  },
);
