import '@src/cypress/types';

describe('video suite 2', () => {
  it('0060 test 1 should have video attached', () => {
    cy.log('1');
  });

  it('0070 test 2 should have video attached', () => {
    cy.log('1');
  });

  it('0080 test 3 should have video attached', () => {
    cy.then(() => {
      throw new Error('This test is expected to fail');
    });
  });
});
