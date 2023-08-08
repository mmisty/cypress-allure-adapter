describe('long command', () => {
  it('test', () => {
    cy.intercept('test.site**', {
      body: `
<html>
    <title>HELLO SITE</title>
    <head></head>
    <body>
        <div>here is site body</div>
    </body>
</html>`,
      delayMs: 200,
    });
    cy.visit('http://test.site');
  });
});
