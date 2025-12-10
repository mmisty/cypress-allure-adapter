import '@src/cypress/types';

describe('request-handler-add-bodies', () => {
  let port = 3000;
  const url = () => `http://localhost:${port}`;

  before(() => {
    cy.task('shutDownTestServer');
    cy.task<number>('startTestServer').then(p => (port = p));
  });

  Cypress.Allure.on('request:started', req => {
    Cypress.Allure.startStep(
      `started:${req.method} ${req.url.replace(String(port), '<port>')}`,
    );
    Cypress.Allure.endStep();
  });

  Cypress.Allure.on('request:ended', req => {
    Cypress.Allure.startStep(
      `ended:${req.method} ${req.url.replace(String(port), '<port>')}`,
    );

    if (req.responseBody !== undefined) {
      Cypress.Allure.parameter('responseBody', req.responseBody);
    }
    Cypress.Allure.endStep();
  });

  const visitHtml = (opts: { body: string; script: string }) => {
    cy.intercept('mytest.com**', {
      body: `<html><body>${opts.body}</body</html><script>${opts.script}</script>`,
    });
    cy.visit('mytest.com');
  };

  it(
    '01 should add request bodies - GET - fetch',
    // @ts-ignore
    { env: { allureAddBodiesToRequests: '*' } },
    () => {
      visitHtml({
        body: `
          <div id="element">click to fetch</div>
          <div id="result"></div>
        `,
        script: `
        document.getElementById('element').addEventListener('click', () => {
              document.getElementById('result').innerText = '';
              fetch('${url()}',{
                      method: "GET",
                      headers: {
                        "Content-type": "application/json; charset=UTF-8"
                      }
                  })
                  .then(response => response.text())
                  .then(data => {
                      document.getElementById('result').innerText = data;
                  })
                  .catch(error => {
                      document.getElementById('result').innerText = 'Error: ' + error;
                  });
          });
        `,
      });
      cy.get('#element').should('exist').click();
      cy.get('#result').should('not.be.empty');
    },
  );

  it(
    '02 should add request bodies - GET - xhr',
    // @ts-ignore
    { env: { allureAddBodiesToRequests: '*' } },
    () => {
      visitHtml({
        body: `
            <div id="element">click to xhr</div>
            <div id="result"></div>
          `,
        script: `
        
          document.getElementById('element').addEventListener('click', () => {
                document.getElementById('result').innerText = '';
                var xhr = new XMLHttpRequest();
                xhr.open('GET', '${url()}', true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            document.getElementById('result').innerText = xhr.responseText;
                        } else {
                            document.getElementById('result').innerText = 'Error: ' + xhr.status;
                        }
                    }
                };
                xhr.send();
            });
          `,
      });

      cy.get('#element').should('exist').click();
      cy.get('#result').should('not.be.empty');
    },
  );

  it(
    '03 should add request bodies - POST - fetch',
    // @ts-ignore
    { env: { allureAddBodiesToRequests: '*' } },
    () => {
      visitHtml({
        body: `
            <div id="element">click to xhr</div>
            <div id="result"></div>
          `,

        script: `
        
          document.getElementById('element').addEventListener('click', () => {
            document.getElementById('result').innerText = '';
            fetch('${url()}/hello',{
                    method: "POST",
                    headers: {
                      "Content-type": "application/json; charset=UTF-8"
                    },
                    body: JSON.stringify({ hello: '12'})
                })
                .then(response => response.text())
                .then(data => {
                    document.getElementById('result').innerText = data;
                })
                .catch(error => {
                    document.getElementById('result').innerText = 'Error: ' + error;
                });
           });
          `,
      });

      cy.get('#element').should('exist').click();
      cy.get('#result').should('not.be.empty');
    },
  );
});
