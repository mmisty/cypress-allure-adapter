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

  it('01 should not add requests made by app', () => {
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

            fetch('$\{url()\}/hello',{
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

    cy.get('#toClickFetch').should('exist').click();
    cy.get('#result').should('not.be.empty');
    cy.get('#toClickXhr').should('exist').click();
    cy.get('#result').should('not.be.empty');
  });
});
`,

  expect: {
    testsNames: [`${rootSuite} 01 should not add requests made by app`],

    testStatuses: [
      {
        testName: '01 should not add requests made by app',
        status: 'passed',
        statusDetails: {
          message: undefined,
        },
      },
    ],

    testAttachments: [],

    testSteps: [
      {
        testName: '01 should not add requests made by app',
        mapStep: m => ({ status: m.status, attachments: m.attachments }),
        filterStep: m =>
          ['before each', 'after each'].every(
            x => m.name && m.name.indexOf(x) === -1,
          ),
        expected: [
          {
            attachments: [],
            name: 'route',
            status: 'passed',
            steps: [],
          },
          {
            attachments: [],
            name: 'visit: mytest.com',
            status: 'passed',
            steps: [],
          },
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
            steps: [],
          },
          {
            attachments: [],
            name: 'get: #result',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'assert: expected **<div#result>** not to be **empty**',
                status: 'passed',
                steps: [],
              },
            ],
          },
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
            steps: [],
          },
          {
            attachments: [],
            name: 'get: #result',
            status: 'passed',
            steps: [
              {
                attachments: [],
                name: 'assert: expected **<div#result>** not to be **empty**',
                status: 'passed',
                steps: [],
              },
            ],
          },
        ],
      },
    ],

    events: [
      'mocha: start',
      'mocha: suite: , ',
      `mocha: suite: ${rootSuite}, ${rootSuite}`,
      'mocha: hook: "before all" hook',
      'cypress: test:before:run: 01 should not add requests made by app',
      'mocha: hook end: "before all" hook',
      'mocha: test: 01 should not add requests made by app',
      'plugin test:started',
      'mocha: hook: "before each" hook',
      'mocha: hook end: "before each" hook',
      'mocha: hook: "before each" hook: [cypress-allure-adapter] requests',
      'mocha: hook end: "before each" hook: [cypress-allure-adapter] requests',
      'plugin request:started GET',
      'plugin request:started GET',
      'plugin request:ended GET',
      'plugin request:ended GET',
      'plugin request:started GET',
      'plugin request:ended GET',
      'mocha: pass: 01 should not add requests made by app',
      'mocha: test end: 01 should not add requests made by app',
      'mocha: hook: "after each" hook',
      'mocha: hook end: "after each" hook',
      `mocha: suite end: ${rootSuite}`,
      'cypress: test:after:run: 01 should not add requests made by app',
      'plugin test:ended',
      'mocha: suite end: ',
      'mocha: end',
    ],
  },
};

export default data;
