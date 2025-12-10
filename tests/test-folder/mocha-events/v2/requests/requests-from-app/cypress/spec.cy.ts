import '@src/cypress/types';

describe('requests-from-app', () => {
  let port = 3000;
  const url = () => `http://localhost:${port}`;

  before(() => {
    cy.task('shutDownTestServer');
    cy.task<number>('startTestServer').then(p => (port = p));
  });

  it('01 should not add requests made by app', () => {
    const visitHtml = (opts: { body: string; script: string }) => {
      cy.intercept('mytest.com**', {
        body: `<html><body>${opts.body}</body</html><script>${opts.script}</script>`,
      });
      cy.visit('mytest.com');
    };

    visitHtml({
      body: `
        <div id="toClickFetch">click to fetch</div>
        <div id="toClickXhr">click to xhr</div>
        <div id="result"></div>
      `,
      script: `
       document.getElementById('toClickFetch').addEventListener('click', () => {
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

            fetch('${url()}/hello',{
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

      document.getElementById('toClickXhr').addEventListener('click', () => {
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

    cy.get('#toClickFetch').should('exist').click();
    cy.get('#result').should('not.be.empty');
    cy.get('#toClickXhr').should('exist').click();
    cy.get('#result').should('not.be.empty');
  });
});
