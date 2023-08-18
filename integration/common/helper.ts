export const html = `
    <html>
    <head></head>
    
    <body>
        <div id="testId">Testing text</div>
        <div class="cls">class cls</div>
        <div class="parent">
            <div class="child">Apple</div>
            <div class="child">Banana</div>
            <div class="child">Cucumber</div>
        </div>
        <a class="new-tab-link" target="_blank" href="mytest.com">Open New Tab</a>
        <a class="new-tab-link-open" target="_blank">Open New Tab (window.open)</a>
    </body>
    
    <script>
      document.querySelector('.new-tab-link-open').addEventListener('click', (e) => {
        e.preventDefault()
        window.open('mytestopen.com')
      })
      
    </script>
    <script>
       var xhr = new XMLHttpRequest();
        xhr.open('GET', 'mytest.com/server', true);
        xhr.send(null);
    </script>
    <script>
       var xhr = new XMLHttpRequest();
        xhr.open('GET', 'mytest.com/server', true);
        xhr.send(null);
    </script>
    <script>
       var xhr = new XMLHttpRequest();
        xhr.open('GET', 'mytest.com/server2', true);
        xhr.send(null);
    </script>
    
    <script>
        fetch('mytest.com/server2')
      .then(response => response.json())
      .then(data => console.log(data));
    </script>
    </html>
    `;

export const htmlNoScripts = `
    <html>
    <head></head>
    
    <body>
        <div id="testId">Testing text</div>
        <div class="cls">class cls</div>
        <div class="parent">
            <div class="child">Apple</div>
            <div class="child">Banana</div>
            <div class="child">Cucumber</div>
        </div>
        <a class="new-tab-link" target="_blank" href="mytest.com">Open New Tab</a>
        <a class="new-tab-link-open" target="_blank">Open New Tab (window.open)</a>
    </body>
    
    <script>
      document.querySelector('.new-tab-link-open').addEventListener('click', (e) => {
        e.preventDefault()
        window.open('mytestopen.com')
      })
      
    </script>
    
    </html>
    `;

export const htmlFormatted = `
    <html>
    <head>
    <style>
    body {background-color: powderblue; font-size: 40pt}
    h1   {color: blue;}
    p    {color: #68e2c0;}
    .title{
        background-color: rgba(98,220,220,0.75);
        margin-bottom: 30px;
    }
    label{
        background-color: rgba(180,246,246,0.75);
        margin-bottom: 30px;
        width: 100%;
        height: 100px;
    }
    input {
        width: 100%;
        height: 100px;
        font-size: 40pt
    }
    .dialog-container {
      width: 500px;
      height: 500px;
      margin: auto;
      margin-top: 200px;
      border: solid 1px;
    }
    .btn {
    
    }
    </style>
</head>
    
    <body>
        <div class="dialog-container">
            <div class="dialog">
              <div class="title">Dialog title</div>
              <div>
                  <input type="text" placeholder="name"/>
              </div>
              <div>
                <label >family name</label>
                <input type="text" placeholder="family name"/>
              </div>
              <div>
                <input type="button" class="btn" aria-disabled="false" value="Submit"/>
              </div>
              <label class="err"></label>
              
              <select>
                <option>opt 1</option>
                <option>opt 2</option>
                <option>opt 3</option>
              </select>
            </div>
        </div>
        <div class="footer">Footer here</div>
        <div class="other-footer">
          <div class="inside-footer">Insider</div>
          <div class="inside-footer">In 2</div>
        </div>
    </body>
    </html>
    `;

const htmlStandard = (options?: HtmlOptions) => `
    <html>
    <head></head>
    <body>
        <div data-testid="someId">
            <div data-testid="wrapInput">
            <input data-testid="inp" type="text" value ="text"/>
            Some text hello!!
            </div>
        </div>
       <textarea class="textArea1" onchange="ch(this.value)"> text area text</textarea>
       <textarea class="textArea2" value onchange="ch(this.value)"> text area text</textarea>
       <textarea class="textArea3" placeholder="this text will show in the textarea" onchange="ch(this.value)"></textarea>
       <label>Some text here</label>
       <label>Some text here label 2</label>
       <label>Some text here label 3</label>
       ${options?.body ?? ''}
       <a href="mylink.com">My link</a>
       <a href="#2" data-qa-id="link-2">My link</a>
       <a href="#3" data-qa-id="link-3">My link</a>
    </body>
    </html>
    <script>
    ${
      options?.scriptOverride ??
      `
        console.log("LOG FROM APPLICATION!!")
        console.warn("WARN FROM APPLICATION!!")
        console.error("ERROR FROM APPLICATION!!")
        ${options?.script ?? ''}
    `
    }
    
    </script>
    <script>
    function ch(value){
      document.getElementsByTagName('textarea').item(0).textContent = value;
      console.log(value);
    }
    </script>
    `;

type HtmlOptions = {
  body?: string;
  script?: string;
  scriptOverride?: string;
  delayBeforeLoad?: number;
  htmlOverride?: string;
  visitTimeout?: number;
};

export const visitHtml = (options?: HtmlOptions): void => {
  cy.intercept('mytest.com**', {
    body: options?.htmlOverride ?? htmlStandard(options),
    delayMs: options?.delayBeforeLoad ?? 200,
  });
  cy.visit('mytest.com', options?.visitTimeout ? { timeout: options.visitTimeout } : {});
};

export const RETRY_CONFIG = {
  retries: {
    runMode: 3,
    openMode: 0,
  },
};
