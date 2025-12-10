const rootSuite = 'before-each-retry-fail';

describe(`${rootSuite} @beforeEachRetry`, { retries: 1 }, () => {
  beforeEach('Named hook', () => {
    cy.log('before each');
    cy.wrap(null).then(() => {
      throw new Error('BEFORE EACH FAIL');
    });
  });

  it('test 01', () => {
    cy.log('test 1');
  });

  it('test 02', () => {
    cy.log('test 2');
  });

  it('test 03', () => {
    cy.log('test 3');
  });
});
