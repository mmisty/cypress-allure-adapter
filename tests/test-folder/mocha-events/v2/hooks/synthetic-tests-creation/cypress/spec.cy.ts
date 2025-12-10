describe(
  'before each fail with retry - first in test then in hook',
  { retries: 2 },
  () => {
    beforeEach('Named hook', function () {
      cy.log('before each');

      if (
        Cypress.currentRetry > 1 &&
        this.currentTest?.title?.indexOf('test 05') !== -1
      ) {
        cy.wrap(null).then(() => {
          throw new Error('Fail in hook');
        });
      }
    });

    for (let i = 1; i <= 10; i++) {
      it(`test ${`0${i}`.slice(-2)}`, function () {
        cy.log(`test ${i}`);

        if (this.test?.title.indexOf('test 05') !== -1) {
          cy.wrap(null).then(() => {
            throw new Error('Fail in test');
          });
        }
      });
    }
  },
);
