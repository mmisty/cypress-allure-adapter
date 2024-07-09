import { TestData } from '@test-utils';
import { basename } from 'path';

const rootSuite = `${basename(__filename)}`;

const data: TestData = {
  name: rootSuite,
  rootSuite,
  fileName: __filename,
  spec: `
  describe('${rootSuite}', () => {
  let port = 3000;
  const url = () => \`http://localhost:$\{port\}\`;

  before(() => {
    cy.task('shutDownTestServer');
    cy.task<number>('startTestServer').then(p => (port = p));
  });

  Cypress.Allure.on('request:started', req => {
    Cypress.Allure.step('started:' + req.method  + ' ' + req.url.replace(port, '<port>'));
  });

  Cypress.Allure.on('request:ended', req => {
    Cypress.Allure.step('ended:' + req.method  + ' ' + req.url.replace(port, '<port>'));
  });

  beforeEach(() => {
    const visitHtml = (opts: { body: string; script: string }) => {
        cy.intercept('mytest.com**', {
          body: \`<html><body>$\{opts.body\}</body</html><script>$\{opts.script\}</script>\`,
        });
        cy.visit('mytest.com');
      };

      visitHtml({
        body: \`
          <div id="toClickFetch">click to fetch</div>
          <div id="toClickXhr">click to xhr</div>
          <div id="result"></div>
        \`,
        script: \`
        document.getElementById('toClickFetch').addEventListener('click', () => {
              document.getElementById('result').innerText = '';
              fetch('$\{url()\}',{
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
              xhr.open('GET', '$\{url()\}', true);
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
        \`,
      });

  })

  it('01 should register request events - fetch', () => {
    cy.get('#toClickFetch').should('exist').click();
  });

   it('02 should register request events - xhr', () => {
    cy.get('#toClickXhr').should('exist').click();
  });
});
`,

  expect: {
    testsNames: [
      `${rootSuite} 01 should register request events - fetch`,
      `${rootSuite} 02 should register request events - xhr`,
    ],

    testStatuses: [
      {
        testName: '01 should register request events - fetch',
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
      {
        testName: '02 should register request events - xhr',
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
    ],

    testAttachments: [],

    testSteps: [
      {
        testName: '01 should register request events - fetch',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'get: #toClickFetch',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'assert: expected **<div#toClickFetch>** to exist in the DOM',
                status: 'passed',
                steps: [],
              },
            ],
          },
          {
            attachments: [],
            name: 'click',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'started:GET http://localhost:<port>/',
                status: 'passed',
                steps: [],
              },
              {
                attachments: [],
                name: 'ended:GET http://localhost:<port>/',
                status: 'passed',
                steps: [],
              },
            ],
          },
        ],
      },

      {
        testName: '02 should register request events - xhr',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'get: #toClickXhr',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'assert: expected **<div#toClickXhr>** to exist in the DOM',
                status: 'passed',
                steps: [],
              },
            ],
          },
          {
            attachments: [],
            name: 'click',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'started:GET http://localhost:<port>/',
                status: 'passed',
                steps: [],
              },
              {
                attachments: [],
                name: 'ended:GET http://localhost:<port>/',
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

export default data;
