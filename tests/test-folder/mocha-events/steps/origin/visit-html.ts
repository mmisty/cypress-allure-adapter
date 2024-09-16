export const visitHtmlCode = `
const visitHtml = (opts) => {
    const html =  \`<html>
      <head></head>
      <body>\$\{opts.body\}</body>
      </html>
      <script>\$\{opts?.script\}</script>\`;
      
    cy.intercept('mytest.com**', {
      body: html
    });
    cy.intercept('mytest2.com**', {
      body: html
    });
    cy.visit('mytest.com');
  }
  
  beforeEach(() => {
    visitHtml({
      body: \`
      
        <div data-test-id="item">
            <div>Apple</div>
            <div data-test-id="other-item">Hello</div>
        </div>
        </br>
        \`,
    });
  });
`;
