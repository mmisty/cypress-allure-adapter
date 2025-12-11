const rootSuite = 'before-each-pass';

describe(`${rootSuite}`, () => {
  beforeEach(() => {
    cy.log('no name hook - before each');
  });

  it('test 1', () => {
    cy.log('test 1');
  });
});
