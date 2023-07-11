import { visitHtml } from '../../common/helper';

describe('video fail retry', { tags: ['@attach', '@video', '@retry'], retries: 2 }, () => {
  beforeEach(() => {
    visitHtml();
  });

  it('01 should attach video to all tests', () => {
    expect(0).eq(0);
    cy.wait(1000);
  });

  it('02 should attach video to all tests', () => {
    expect(0).eq(0);
    cy.wait(1000);
  });

  it('03 should attach video to all tests', () => {
    cy.wait(1000);
    expect(Cypress.currentRetry < 2 ? 1 : 0).eq(0);
  });
});
