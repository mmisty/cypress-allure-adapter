import '@src/cypress/types';

describe('video suite', () => {
  it('0010 test 1 should have video attached', () => {
    cy.log('1');
  });

  it('0020 test 2 should have video attached', () => {
    cy.log('1');
  });

  it('0030 test 3 should have video attached', () => {
    cy.then(() => {
      throw new Error('This test is expected to fail');
    });
  });
});
