before('Global Setup', () => {
  console.log('Setup');
  cy.allure().step('global setup');
});

after('Global teardown', () => {
  console.log('teardown');
});

describe('hooks test', () => {
  before(() => {
    cy.log('before');
  });

  before('named hook before', () => {
    cy.log('before');
  });

  beforeEach('Named hook', () => {
    cy.log('before each');
  });

  beforeEach(() => {
    cy.log('no name hook - before each');
  });

  it('test 1', () => {
    cy.log('test 1');
  });

  it('test 2', () => {
    cy.log('test 2');
  });

  afterEach(() => {
    cy.log('log after each');
  });

  afterEach('Named after', () => {
    cy.log('log after each');
  });

  after(() => {
    cy.log('after');
  });

  after('named hook all after', () => {
    cy.log('after');
  });
});
