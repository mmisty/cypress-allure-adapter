# cypress-allure-adapter

This is allure adapter for Cypress providing realtime results. 
It is useful when using Allure TestOps - so you can watch tests execution.
It adds tests, steps, suites and screenshots during tests execution.



Some settings were taken from [@shelex/cypress-allure-plugin](https://www.npmjs.com/package/@shelex/cypress-allure-plugin)


## Installation

Install adapter by `npm i -D @mmisty/cypress-allure-adapter`

Setup: 

1. **Update support**: add `allureAdapterSetup(); ` in your `support/index.ts` file (or `e2e.ts` file)
   ```javascript
   import { allureAdapterSetup } from '@mmisty/cypress-allure-adapter';
   
   allureAdapterSetup();
   ```
   
2. **Update plugins**: add `configureAllureAdapterPlugins(on, config);` into your plugins file:

   ```javascript
   // cypress.config.ts
   import { configureAllureAdapterPlugins } from '@mmisty/cypress-allure-adapter/plugins';
   
   export default defineConfig({
     e2e: {
       setupNodeEvents(on, config) {
         configureAllureAdapterPlugins(on, config);
         
         return config;
       },
       // ...
     }
   });
   ```
3. **Update environment variables**: in `cypress.config.ts` or in your env files: 
    - `allure` => `true` - will enable reporting
    - `allureResults` => `allure-results` - path to allure-results (default 'allure-results')
    - `allureResultsWatchPath` => path to folder where results will be moved after spec is 
   done (if you use Allure TestOps specify this path to watch), but default this is not specified
   When you use this path tests will start to appear in Allure TestOps only after spec is finished. If not use this with Allure 
   TestOps then some videos may not be uploaded. Will be uploaded only for 1 test from spec.

    - `allureCleanResults` => `true` - will remove allure results on cypress start
    - `allureSkipCommands` => `wrapNoLog,sync` - commands that will not be logged, separated with comma
    - `allureAttachRequests` => `true` - attach request/response body and status
    - `allureAddVideoOnPass` => `true` - attach video for all tests (including passed), otherwise attach only for failed, broken, unknown
    - `allureShowDuplicateWarn` => `true` - show console warnings about test duplicates, default false
    - `allureWrapCustomCommands` => `true` - (default true) - will wrap custom commands, so custom command will have child steps in report
    - `tmsPrefix` and  `issuePrefix`  - you can specify prefix to tms using this.
      Also link can be specified with `*` - it will be replced with id.
     ```javascript
        // cypress.config.ts 
        env: {
          tmsPrefix: 'http://jira.com' 
          issuePrefix: 'http://jira.com/PROJECT-1/*/browse' 
        }  
    ```
    ```javascript
        // test.spec.ts
        cy.allure().tms('ABC-1'); // http://jira.com/ABC-1
        cy.allure().issue('ABC-2'); // http://jira.com/PROJECT-1/ABC-2/browse
     ```
   EXAMPLE: 
      ```
      env: {
         allure: 'true',
         allureResults: 'allure-results',
         allureCleanResults: 'true',
         allureSkipCommands: 'wrapNoLog,sync', // separated comma
         // ... other env varialbles
      }
      ```

4. no need to setup types - should be done automatically

### To see report
To see Allure report locally after tests were executed install `allure-commandline`: `npm i -D allure-commandline`

and run command `allure serve`

### Advanced

#### after:spec
If you are using Cypress action `after:spec` in plugins you 
can use the following configuration to have video attached to tests: 

```javascript
// cypress.config.ts
import { configureAllureAdapterPlugins } from '@mmisty/cypress-allure-adapter/plugins';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const reporter = configureAllureAdapterPlugins(on, config);
      
      on('after:spec', async (spec, results) => {
        // your code in after spec
        await reporter.afterSpec({ results });
      })
      
      return config;
    },
    // ...
  }
});

```
#### Start/End test events
If you need to add labels, tags or other meta info for tests you can use the following events: 
 - `test:started` is fired after tests started but before all "before each" hooks
 - `test:ended` is fired after all "after each" hooks

```javascript
Cypress.Allure.on('test:started', test => {
    Cypress.Allure.label('tag', 'started');
  });
```

And also if you need to do something with test before it ends: 
```javascript
Cypress.Allure.on('test:ended', test => {
    Cypress.Allure.label('tag', 'ended');
    Cypress.Allure.step('before end step');
  });

```
You can put this into your `support/index.ts` file.

## Allure Interface
The following commands available from tests with `cy.allure()` or through `Cypress.Allure` interface: 
```javascript
/**
     * Adds label to test result
     * @param name - label name
     * @param value - label value
     * @example
     * cy.allure().label('tag', '@P1');
     */
    label(name: string, value: string): T;

    /**
     * Starts step
     * @param name - step name
     * @example
     * cy.allure().startStep('should login');
     */
    startStep(name: string): T;

    /**
     * Ends current step
     * @example
     * cy.allure().endStep();
     */
    endStep(): T;

    /**
     * Created finished step
     * @example
     * cy.allure().step('should login');
     */
    step(name: string): T;

    /**
     * Adds tags to test
     * @param tags
     * @example
     * cy.allure().tag('@regression', '@P1');
     */
    tag(...tags: string[]): T;

    /**
     * Adds severity to test
     * @param level 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
     * @example
     * cy.allure().severity('blocker');
     */
    severity(level: Severity): T;

    /**
     * Adds thread to test
     * @param value string to group in timeline
     * @example
     * cy.allure().thread('01');
     */
    thread(value: string): T;

    /**
     * Sets test full name
     * @param value string to group in timeline
     * @example
     * cy.allure().fullName('authentication: should login');
     */
    fullName(value: string): T;

    /**
     * Sets label 'owner' - will be shown in allure report as Owner field
     * @param value owner name
     * @example
     * cy.allure().owner('TP');
     */
    owner(value: string): T;

    /**
     * Sets label 'lead'
     * @param value lead name
     * @example
     * cy.allure().lead('TP');
     */
    lead(value: string): T;

    /**
     * Sets label 'host'
     * @param value host name
     * @example
     * cy.allure().host('MAC-01');
     */
    host(value: string): T;

    /**
     * Sets label 'layer'
     * @param value layer name
     * @example
     * cy.allure().host('MAC-01');
     */
    layer(value: string): T;

    /**
     * Sets label 'browser'
     * @param value layer name
     * @example
     * cy.allure().browser('chrome');
     */
    browser(value: string): T;

    /**
     * Sets label 'device'
     * @param value layer name
     * @example
     * cy.allure().device('MAC-01');
     */
    device(value: string): T;

    /**
     * Sets label 'os'
     * @param value os name
     * @example
     * cy.allure().os('ubuntu');
     */
    os(value: string): T;

    epic(value: string): T;
    link(url: string, name?: string, type?: LinkType): T;
    tms(url: string, name?: string): T;
    issue(url: string, name?: string): T;

    feature(value: string): T;
    story(value: string): T;
    allureId(value: string): T;
    language(value: string): T;
    parameter(name: string, value: string): T;
    parameters(...params: Parameter[]): T;
    testParameter(name: string, value: string): T;

    /**
     * Sets test status. In some cases you may need to change test status
     * @param result - 'passed' | 'failed' | 'skipped' | 'broken' | 'unknown';
     * @param details - status details - optional
     * @param details.message - message that is shown in report for test
     * @param details.trace  - stack trace
     * @example
     * cy.allure().testStatus('broken', { message: 'review test' });
     */
    testStatus(result: Status, details?: StatusDetails): T;

    /**
     * Sets test details - In some cases you may need to change test details message
     * @param details - status details
     * @param details.message - message that is shown in report for test
     * @param details.trace  - stack trace
     * @example
     * cy.allure().testDetails({ message: 'review test' });
     */
    testDetails(details: StatusDetails): T;

    /**
     * Adds attachment to current test
     * @param name attachment name
     * @param content - contents of attachmnet
     * @param type - content type
     */
    testAttachment(name: string, content: Buffer | string, type: ContentType): T;

    /**
     * Adds file attachment to current test
     * @param name attachment name
     * @param file - path to file
     * @param type - content type
     */
    testFileAttachment(name: string, file: string, type: ContentType): T;

    /**
     * Adds attachment to current executable (step, hook or test)
     * @param name attachment name
     * @param content - contents of attachmnet
     * @param type - content type
     */
    attachment(name: string, content: Buffer | string, type: ContentType): T;

    /**
     * Adds file attachment to current executable (step, hook or test)
     * @param name attachment name
     * @param file - path to file
     * @param type - content type
     */
    fileAttachment(name: string, file: string, type: ContentType): T;

    /**
     * Add description HTML
     * Will concatenate all descriptions
     * @param value - html string
     * @example
     * cy.allure().addDescriptionHtml('<b>description</b>')
     */
    addDescriptionHtml(value: string): T;

    /**
     * Writes environment info file into allure results path
     * @param info - dictionary
     * @example
     * cy.allure().writeEnvironmentInfo({
     *    OS: 'ubuntu',
     *    commit: 'fix of defect 1'
     * })
     */
    writeEnvironmentInfo(info: EnvironmentInfo): T;

    /**
     * Writes executor info file into allure results path
     * @param info - dictionary
     * @example
     *  cy.allure().writeExecutorInfo({
     *       name: '1',
     *       type: 'wwew',
     *       url: 'http://build',
     *       buildOrder: 1,
     *       buildName: 'build name',
     *       buildUrl: 'http://build.url',
     *       reportUrl: 'http://report/1',
     *       reportName: 'report 1',
     *     });
     */
    writeExecutorInfo(info: ExecutorInfo): T;

    /**
     * Writes categories definitions file into allure results path
     * @param categories - Categories to write
     */
    writeCategoriesDefinitions(categories: Category[]): T;

    /**
     * Delete allure-results
     */
    deleteResults(): T;
```

## Troubleshooting

To see debug log run cypress with DEBUG env variable like: `DEBUG=cypress-allure* npm run cy:open`

## Change log
### 0.6.0
 - setting to disable warning about duplicates

### 0.5.0
 - fixes to attach videos by Allure TestOps
 - setting to attach videos only for unsuccessfull results
 - setting to attach requests

### 0.0.2 
Initial version