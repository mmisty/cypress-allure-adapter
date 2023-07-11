import { visitHtml } from '../../common/helper';

describe('video fail', { tags: ['@attach', '@video'] }, () => {
  beforeEach(() => {
    visitHtml();
  });

  it('01 should attach video to all tests', () => {
    cy.wait(1000);
    expect(0).eq(0);
  });

  it('02 should attach video to all tests', () => {
    cy.wait(1000);
    expect(0).eq(0);
  });

  it('03 should attach video to all tests', () => {
    cy.wait(1000);
    expect(1).eq(0);
  });
});
