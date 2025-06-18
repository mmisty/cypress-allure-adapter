import { TestData } from '@test-utils';
import { createResTest2, generateChecksTests } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

describe('suite: request handler with specific requests - should add body only for selected', () => {
  const data: TestData = {
    name: rootSuite,
    rootSuite,
    fileName: __filename,
    spec: `
describe('${rootSuite}',  {
  env: {allureAddBodiesToRequests: '**/mirror**'}
},() => {
  let port = 3000;
  const url = () => \`http://localhost:$\{port\}\`;

  before(() => {
    cy.task('shutDownTestServer');
    cy.task<number>('startTestServer').then(p => (port = p));
  });

  Cypress.Allure.on('request:started', (req, log) => {
    Cypress.Allure.startStep('started:' + req.method  + ' ' + req.url.replace(port, '<port>'));
    // Cypress.Allure.attachment('name', JSON.stringify(log, null, '  '), 'application/json');
    Cypress.Allure.endStep();

  });

  Cypress.Allure.on('request:ended', (req, log) => {
    Cypress.Allure.startStep('ended:' + req.method  + ' ' + req.url.replace(port, '<port>'));
    // Cypress.Allure.attachment('name', JSON.stringify(log, null, '  '), 'application/json');
    if(req.responseBody!==undefined){
      Cypress.Allure.parameter("responseBody", req.responseBody);
    }
    Cypress.Allure.endStep();
  });

  const visitHtml = (opts: { body: string; script: string }) => {
      cy.intercept('mytest.com**', {
        body: \`<html><body>$\{opts.body\}</body</html><script>$\{opts.script\}</script>\`,
      });
      cy.visit('mytest.com');
    };

  
  it('02 should add request bodies - POST - fetch', () => {
      visitHtml({
          body: \`
            <div id="element">click to xhr</div>
            <div id="result"></div>
          \`,

          script: \`
        
          document.getElementById('element').addEventListener('click', () => {
            document.getElementById('result').innerText = '';
            fetch('$\{url()\}/mirror',{
                    method: "POST",
                    headers: {
                      "Content-type": "application/json; charset=UTF-8"
                    },
                    body: JSON.stringify({ mirror: '12'})
                })
                .then(response => response.text())
                .then(data => {
                    document.getElementById('result').innerText = data;
                })
                .catch(error => {
                    document.getElementById('result').innerText = 'Error: ' + error;
                });
           });
          \`,
        });

    cy.get('#element').should('exist').click();
    cy.get('#result').should('not.be.empty'); // wait request to finish
  });

  it('03 should add request bodies - POST - fetch', () => {
      visitHtml({
          body: \`
            <div id="element">click to xhr</div>
            <div id="result"></div>
          \`,

          script: \`
        
          document.getElementById('element').addEventListener('click', () => {
            document.getElementById('result').innerText = '';
            fetch('$\{url()\}/hello',{
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
          \`,
        });

    cy.get('#element').should('exist').click();
    cy.get('#result').should('not.be.empty'); // wait request to finish
  });
});
`,

    expect: {
      testsNames: [
        `${rootSuite} 02 should add request bodies - POST - fetch`,
        `${rootSuite} 03 should add request bodies - POST - fetch`,
      ],

      testStatuses: [
        {
          testName: '02 should add request bodies - POST - fetch',
          status: 'passed',
          statusDetails: {
            message: undefined,
          },
        },
        {
          testName: '03 should add request bodies - POST - fetch',
          status: 'passed',
          statusDetails: {
            message: undefined,
          },
        },
      ],

      testAttachments: [],

      testSteps: [
        {
          testName: '02 should add request bodies - POST - fetch',
          mapStep: m => ({
            status: m.status,
            attachments: m.attachments,
            parameters: m.parameters,
          }),
          filterStep: m =>
            ['before each', 'after each', 'route', 'visit'].every(
              x => m.name && m.name.indexOf(x) === -1,
            ),
          expected: [
            {
              attachments: [],
              name: 'get: #element',
              parameters: [],
              status: 'passed',
              steps: [
                {
                  attachments: [],
                  name: 'assert: expected **<div#element>** to exist in the DOM',
                  parameters: [],
                  status: 'passed',
                  steps: [],
                },
              ],
            },
            {
              attachments: [],
              name: 'click',
              parameters: [],
              status: 'passed',
              steps: [
                {
                  attachments: [],
                  name: 'started:POST http://localhost:<port>/mirror',
                  parameters: [],
                  status: 'passed',
                  steps: [],
                },
                {
                  attachments: [],
                  name: 'ended:POST http://localhost:<port>/mirror',
                  parameters: [
                    {
                      name: 'responseBody',
                      value: '{}',
                    },
                  ],
                  status: 'passed',
                  steps: [],
                },
              ],
            },
            {
              attachments: [],
              name: 'get: #result',
              parameters: [],
              status: 'passed',
              steps: [
                {
                  attachments: [],
                  name: 'assert: expected **<div#result>** not to be **empty**',
                  parameters: [],
                  status: 'passed',
                  steps: [],
                },
              ],
            },
          ],
        },

        {
          testName: '03 should add request bodies - POST - fetch',
          mapStep: m => ({
            status: m.status,
            attachments: m.attachments,
            parameters: m.parameters,
          }),
          filterStep: m =>
            ['before each', 'after each', 'route', 'visit'].every(
              x => m.name && m.name.indexOf(x) === -1,
            ),
          expected: [
            {
              attachments: [],
              name: 'get: #element',
              parameters: [],
              status: 'passed',
              steps: [
                {
                  attachments: [],
                  name: 'assert: expected **<div#element>** to exist in the DOM',
                  parameters: [],
                  status: 'passed',
                  steps: [],
                },
              ],
            },
            {
              attachments: [],
              name: 'click',
              parameters: [],
              status: 'passed',
              steps: [
                {
                  attachments: [],
                  name: 'started:POST http://localhost:<port>/hello',
                  parameters: [],
                  status: 'passed',
                  steps: [],
                },
                {
                  attachments: [],
                  name: 'ended:POST http://localhost:<port>/hello',
                  parameters: [],
                  status: 'passed',
                  steps: [],
                },
              ],
            },
            {
              attachments: [],
              name: 'get: #result',
              parameters: [],
              status: 'passed',
              steps: [
                {
                  attachments: [],
                  name: 'assert: expected **<div#result>** not to be **empty**',
                  parameters: [],
                  status: 'passed',
                  steps: [],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const res = createResTest2([data.spec], {
    allureAddVideoOnPass: 'false' /* DEBUG: 'true'*/,
  });

  generateChecksTests(res, [data]);
});
