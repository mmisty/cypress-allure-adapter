before(() => {
  cy.log('global setup');
});

after(() => {
  cy.log('global teardown');
});

describe('hello suite', () => {
  before('Named Hook', () => {
    cy.log('global setup in suite');
  });

  beforeEach(() => {
    cy.log('setup before each');
  });

  it('hello test', () => {
    cy.log('message');
  });

  afterEach(() => {
    cy.log('teardown after each');
  });

  after('Named Hook After', () => {
    cy.log('global teardown in suite');
  });
});
