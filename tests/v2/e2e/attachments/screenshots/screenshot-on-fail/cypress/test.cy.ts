describe('automatic screenshots when fail', () => {
  it('0010 screenshot test', () => {
    cy.screenshot('my-test');
  });

  it('0020 screenshot test', () => {
    cy.then(() => {
      throw new Error('This test is expected to fail');
    });
  });
});

describe('automatic screenshots when hooks fail', () => {
  before(() => {
    cy.then(() => {
      throw new Error('This test is expected to fail');
    });
  });

  it('0030 should have failure', () => {
    cy.log('hello');
  });
});
