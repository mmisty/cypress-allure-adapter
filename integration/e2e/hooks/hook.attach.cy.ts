import { ContentType } from '@src/plugins/allure-types';

describe('hooks test.attachments', () => {
  before(() => {
    cy.log('before');
    cy.allure().attachment('1.txt', 'before all', ContentType.TEXT);
  });

  beforeEach('Named hook', () => {
    cy.log('before each');
    cy.allure().attachment('2.txt', 'before each', ContentType.TEXT);
  });

  it('test 1', () => {
    cy.log('test 1');
  });

  it('test 2', () => {
    cy.log('test 2');
  });

  afterEach(() => {
    cy.log('log after each');
    cy.allure().attachment('3.txt', 'after each', ContentType.TEXT);
  });

  after('Named after', () => {
    cy.log('log after');
    cy.allure().attachment('4.txt', 'after', ContentType.TEXT);
  });
});
