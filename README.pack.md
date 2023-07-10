# cypress-allure-adapter

This is allure adapter for cypress providing realtime results. 
It is useful when using Allure TestOps - so you can watch tests execution.
It adds tests, steps, suites and screenshots during tests execution.

Note: Video uploads doesn't work well yet since video is being generated after all tests in spec are finished.

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
    - `allureResults` => `allure-results` - path to allure-results
    - `allureCleanResults` => `true` - will remove allure results on cypress start
    - `allureSkipCommands` => `wrapNoLog,sync` - commands that will not be logged, separated with comma
   ```
   env: {
      allure: 'true',
      allureResults: 'allure-results',
      allureCleanResults: 'true',
      allureSkipCommands: 'wrapNoLog,sync', // separated comma
      //...
   }
   ```

4. no need to setup types - should be done automatically

### To see report
To see Allure report locally after tests were executed install `allure-commandline`: `npm i -D allure-commandline`

and run command `allure serve`

### Advanced
If you are using Cypress action `after:spec` in plugins you 
can use the following configuration to have video attached to tests: 

```javascript
// cypress.config.ts
import { configureAllureAdapterPlugins } from '@mmisty/cypress-allure-adapter/plugins';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const reporter = configureAllureAdapterPlugins(on, config);
      
      on('after:spec', (spec, results) => {
        // your code in after spec
        reporter.afterSpec({ results });
      })
      
      return config;
    },
    // ...
  }
});

```



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

### 0.0.2 
Initial version