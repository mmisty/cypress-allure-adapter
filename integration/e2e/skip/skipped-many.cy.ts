describe('many skipped @many', () => {
  for (let i = 1; i <= 30; i++) {
    it.skip(`test skipped ${i}`, () => {
      cy.log(`test ${i}`);
    });
  }
});
