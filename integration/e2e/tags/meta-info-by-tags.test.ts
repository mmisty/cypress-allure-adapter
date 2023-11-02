describe('meta info should be added by special tags', () => {
  it(
    'issue ',
    {
      tags: ['@issue("123")'],
    },
    () => {
      cy.log('issue');
    },
  );

  it('issue inline @issue("123")', () => {
    cy.log('issue');
  });

  // doesn't work as expected need to fix grep package
  it(
    'several different issues',
    {
      tags: ['@issue("123")', '@issue("456")'],
    },
    function () {
      cy.log(`${this.test?.tags?.flatMap(t => t.info)}`);
    },
  );

  it('issue description @issue("123", "description 123")', () => {
    cy.log('issue with description');
  });

  it('tms @tms("123")', () => {
    cy.log('tms');
  });

  it('owner @owner("T P")', () => {
    cy.log('owner');
  });

  it('label @label("path","hello")', () => {
    cy.log('label');
  });

  it('suite @suite("suite") @subSuite("sub-suite") @parentSuite("parent-suite")', () => {
    cy.log('suites');
  });
});
