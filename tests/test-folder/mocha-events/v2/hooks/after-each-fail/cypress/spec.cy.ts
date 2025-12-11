const rootSuite = 'after-each-fail';

describe(`${rootSuite}`, () => {
  afterEach(() => {
    cy.log('after each');
    cy.wrap(null).then(() => {
      throw new Error('fail in after each');
    });
  });

  it('test 1', () => {
    cy.log('test 1');
  });
});
