before('global', () => {
  cy.log('glob setup');
});
after('global after', () => {
  cy.log('glob after');
});

describe('hello suite', () => {
  beforeEach(() => {
    cy.log('before1');
  });

  it('hello test', () => {
    cy.log('123');
  });

  describe('sub suite', () => {
    beforeEach(() => {
      cy.log('before2');
    });

    it('hello test -child', () => {
      cy.log('123');
    });

    afterEach(() => {
      cy.log('after2');
    });
  });

  afterEach(() => {
    cy.log('after1');
  });
});
