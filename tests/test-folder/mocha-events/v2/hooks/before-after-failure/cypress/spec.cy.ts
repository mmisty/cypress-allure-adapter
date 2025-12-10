const rootSuite = 'before-after-failure';

describe(`${rootSuite}`, () => {
  before('in suite', () => {
    throw new Error('Failure in before hook');
  });

  after('after in suite', () => {
    throw new Error('Failure in after hook');
  });

  it('test 1', () => {
    cy.log('test 1');
  });

  it('test 2', () => {
    cy.log('test 2');
  });
});
