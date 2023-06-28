export const something = () => {
  cy.window().then(() => {
    console.log('log in console after got win');
  });
};
