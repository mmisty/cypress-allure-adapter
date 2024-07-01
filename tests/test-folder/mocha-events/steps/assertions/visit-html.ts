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
        <div data-test-id="item">
            <div>Banana</div>
            <div data-test-id="other-item">Buy</div>
        </div>
        </br>
        <div data-test-id="item">
            <div>Orange</div>
            <div data-test-id="other-item">Is Round</div>
        </div>

        <div data-qa-id="task-card-title">
            <div>Task card</div>
        </div>

\`,
      script: \`
      
      // add element after some time
      setTimeout(()=> {
        var child = document.createElement("div");
        child.setAttribute('data-test-id','item');
        child.innerHTML = '<div>Lichi</div><div data-test-id="other-item">Fruit</div>';
        document.body.appendChild(child);
    }, 100);
    
    setTimeout(()=> {
        
         var child2 = document.createElement("div");
        child2.setAttribute('data-test-id','item');
        child2.innerHTML = '<div>Lichi</div><div data-test-id="other-item">Tropical Fruit</div>';
        document.body.appendChild(child2);
    }, 200);
    
    setTimeout(()=> {
        
        var child2 = document.createElement("div");
        child2.setAttribute('data-qa-id','task-card-title');
        child2.innerHTML = '<div>Task Card 2</div>';
        document.body.appendChild(child2);
    }, 300);
      \`,
    });
  });
`;
