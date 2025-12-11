const rootSuite = 'after-each-pass';

describe(`${rootSuite}`, () => {
  afterEach(() => {
    cy.log('no name hook - after each');
  });

  it('test 1', () => {
    cy.log('test 1');
  });
});
