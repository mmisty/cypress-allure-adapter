const rootSuite = 'before-each-fail';

describe(`${rootSuite}`, () => {
  // @ts-ignore
  beforeEach('named before each', () => {
    cy.log('before each');
    cy.wrap(null).then(() => {
      throw new Error('fail in before each');
    });
  });

  it('test 1', () => {
    cy.log('test 1');
  });
});
