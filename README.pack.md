# cypress-allure-adapter

This is allure adapter for Cypress providing realtime results. 
It is useful when using Allure TestOps - so you can watch tests execution. It adds tests, steps, suites and screenshots during tests execution.

In the same time you can generate [Allure Report](https://github.com/allure-framework/allure2) from these results and it will have all necessary fields.


Some settings were taken from [@shelex/cypress-allure-plugin](https://www.npmjs.com/package/@shelex/cypress-allure-plugin)

## Table of Contents

1. [Installation](#installation)
1. [Environment variables](#environment-variables)
2. [To see allure report](#to-see-report)
3. [Allure Interface](#allure-interface)
4. [Advanced](#advanced)
    - [after:spec event](#afterspec-event)
    - [Before run](#before-run)
    - [Start/End test events](#startend-test-events)
5. [Troubleshooting](#troubleshooting)
6. [Change log](#change-log)

## Installation

Install adapter by `npm i -D @mmisty/cypress-allure-adapter`

**Setup**: 

### 1. Update support

Add `allureAdapterSetup(); ` in your `support/index.ts` file (or `e2e.ts` file)
   ```javascript
   import { allureAdapterSetup } from '@mmisty/cypress-allure-adapter';
   
   allureAdapterSetup();
   ```
If you want all custom commands to be correctly wrapped in report register adapter before adding custom commands: 

 ```javascript
   import { allureAdapterSetup } from '@mmisty/cypress-allure-adapter';
   
   allureAdapterSetup();
   // register custom commands here
   ```

### 2. Update plugins (setupNodeEvents)
Add `configureAllureAdapterPlugins(on, config);` into your plugins file:

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

### 3. Update environment variables
In `cypress.config.ts` or in your environment files set `allure` env var to `true`.

See other [environment variables](#environment-variables)

### 4. Types
No need to setup types - should be done automatically

That's it! :tada:

## Environment variables

| Variable                  | Value / Example                                                    | Default          | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|---------------------------|--------------------------------------------------------------------|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| allure                    | boolean: true/false                                                | false            | Enables reporting                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| allureResults             | string: `allure-results`                                           | `allure-results` | Path to allure results                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| allureResultsWatchPath    | string: `allure-results/watch`                                     | undefined        | This is needed when using Allure TestOps: <br/>path to folder where results will be moved after all tests from spec are executed. <br/>This path is what you need to watch when using Allure TestOps, but default this is not specified. When you use this path test results will start to appear in Allure TestOps only after spec is finished. <br/>If do not use this with Allure TestOps some videos may not be uploaded - videos will be uploaded only for 1 test from spec file. |
| allureCleanResults        | boolean: true/false                                                | false            | Will remove allure results on cypress start (it will be done once, after plugins are loaded)                                                                                                                                                                                                                                                                                                                                                                                           |
| allureSkipCommands        | string - command separated with comma: `screenshot,wait`           | undefined        | Will not log specified commands as steps in allure report                                                                                                                                                                                                                                                                                                                                                                                                                              |
| allureAttachRequests      | boolean: true/false                                                | false            | Attach request/response body and status as files to request step                                                                                                                                                                                                                                                                                                                                                                                                                       |
| allureCompactAttachments  | boolean: true/false                                                | true             | Stringify requests attachments with spaces or not                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| allureAddVideoOnPass      | boolean: true/false                                                | false            | When true - will attach video for all tests (including passed), otherwise will attach videos only for failed, broken, unknown                                                                                                                                                                                                                                                                                                                                                          |
| allureWrapCustomCommands  | boolean: true/false                                                | true             | will wrap custom commands, so custom command will have child steps in report                                                                                                                                                                                                                                                                                                                                                                                                           |
| tmsPrefix                 | string: `http://jira.com` or `http://jira.com/PROJECT-1/*/browse`  | undefined        | You can specify prefix to tms using this.  <br/>Also link can be specified with `*` - it will be replced with id.                                                                                                                                                                                                                                                                                                                                                                      |
| issuePrefix               | string: `http://jira.com` or `http://jira.com/PROJECT-1/*/browse`  | undefined        | The same as tmsPrefix - for issue                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| allureShowDuplicateWarn   | boolean: true/false                                                | false            | Show console warnings about test duplicates.                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### tmsPrefix and issuePrefix
`tmsPrefix` and  `issuePrefix`  - you can specify prefix to tms using this.
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
  

### To see report
In order to see Allure Report you need to install the [CLI](https://github.com/allure-framework/allure2#download).

For nodejs you can use [allure-commandline](https://www.npmjs.com/package/allure-commandline):

`npm i -D allure-commandline`

After installed `allure` command will be available.
To see a report in browser, run in console

```
allure serve
```

If you want to generate html version, run in console

```
allure generate
```

## Allure Interface
The following commands available from tests with `cy.allure()` or through `Cypress.Allure` interface: 

### label
**label(name: string, value: string)**

Adds label to test result, accepts label name and label value

```javascript
cy.allure().label('tag', '@P1');
```

### startStep
**startStep(name: string)**

Starts allure step

```javascript
cy.allure().startStep('should login');
```

### endStep
**endStep(status?: Status)**

Ends current step with 'passed' (when status not specified) or specified status

```javascript
cy.allure().endStep();
```
```javascript
cy.allure().endStep('failed');
```

### step
**step(name: string)**

Adds finished step with passed status.

```javascript
cy.allure().step('should login');
```

### tag
**tag(...tags: string[])**

Adds tags to test

```javascript
cy.allure().tag('@regression', '@P1');
```

### severity
**severity(level: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial')**

Adds test severity

```javascript
cy.allure().severity('blocker');
```

### thread
**thread(value: string)**

Adds thread label to test.

Thread label is being used in timeline

**todo: screen**

```javascript
cy.allure().thread('01');
```

### fullName
**fullName(value: string)**

Sets test full name 

Full name is being used for history id

```javascript
cy.allure().fullName('authentication: should login');
```

### owner
**owner(value: string)**

Sets label 'owner' 

Will be shown in allure report as Owner field

```javascript
cy.allure().owner('TP');
```


### lead
**lead(value: string)**

Sets label 'lead' 

Not shown in report, analytics label

```javascript
cy.allure().lead('TP');
```


### host
**host(value: string)**

Sets label 'host'

Will be shown in report on timeline tab

```javascript
cy.allure().host('MAC-01');
```

### layer
**layer(value: string)**

Sets label 'layer'

```javascript
cy.allure().layer('UI');
```

### browser
**browser(value: string)**

Sets label 'browser'

Not shown in report - analytics label

```javascript
cy.allure().browser('chrome');
```


### device
**device(value: string)**

Sets label 'device'

Not shown in report - analytics label

```javascript
cy.allure().device('Comp');
```

### os
**os(value: string)**

Sets label 'os'

Not shown in report - analytics label

```javascript
cy.allure().os('ubuntu');
```

### language
**language(value: string)**

Sets label 'language'

Not shown in report - analytics label

```javascript
cy.allure().language('javascript');
```
### allureId
**allureId(value: string)**

Sets label 'ALLURE_ID'

todo: what is it for in report?

Not shown in report - analytics label

```javascript
cy.allure().allureId('123');
```

### epic
**epic(value: string)**

Sets epic to test

Will be shown on Behaviors tab in Report (grouped by epic -> feature -> story)

```javascript
cy.allure().epic('Epic Feature');
```


### story
**story(value: string)**

Sets story to test

Will be shown on Behaviors tab in Report (grouped by epic -> feature -> story)

```javascript
cy.allure().story('User Story');
```


### feature
**feature(value: string)**

Sets feature to test

Will be shown on Behaviors tab in Report (grouped by epic -> feature -> story)

```javascript
cy.allure().feature('Feature');
```


### link
**link(url: string, name?: string, type?: 'issue' | 'tms')**

Adds link to test.

Will be shown in Links field for test

```javascript
cy.allure().link('http://bbb.com/1', 'issue-1', 'issue');
```

### tms
**tms(url: string, name?: string)**

Adds link to test of type 'tms' ('tms' will have specific icon )

When `tmsPrefix` environment variable added no need to input the whole URL

Will be shown in Links field for test

```javascript
cy.allure().tms('1', 'tms-1');
```

### issue
**issue(url: string, name?: string)**

Adds link to test of type 'issue' ('issue' will have specific icon - bug icon )

When `issuePrefix` environment variable added no need to input the whole URL

Will be shown in Links field for test

```javascript
cy.allure().issue('1', 'issue-1');
```


### parameter
**parameter(name: string, value: string)**

Adds parameter to current step or test (when no current step)

Will be shown in report: 
 - for step : as table below step
 - for test : in Parameters section for test and in overview

```javascript
cy.allure().parameter('varA', 'bus');
```

### testParameter
**testParameter(name: string, value: string)**

Adds parameter to current test

Will be shown in report in Parameters section for test and in overview

```javascript
cy.allure().parameter('varA', 'bus');
```

### parameters
**parameters(...params: { name: string, value: string } [])**

Adds several parameters to current step or test (when no current step)

see [parameter](#parameter)

```javascript
cy.allure().parameters( {name: 'varA', value: 'bus'}, {name: 'varB', value: 'car'} );
```



### testStatus
**testStatus(result: 'passed' | 'failed' | 'skipped' | 'broken' | 'unknown', details?: StatusDetails)**
details is optional: 
- details.message - message that is shown in report for test
- details.trace  - stack trace

Sets test status. In some cases you may need to change test status (testing purposes, or depending on tags)

```javascript
cy.allure().testStatus('broken', { message: 'review test' });
```

### testStatus
**testDetails(details: StatusDetails)**

- details.message - message that is shown in report for test
- details.trace  - stack trace

Sets test details but keeps test status as is 

In some cases you may need to change test details message (for example skip reason depending on tag)


```javascript
cy.allure().testDetails({ message: 'ignored - not implemented' });
```


### attachment
**attachment(name: string, content: Buffer | string, type: ContentType)**

- content - contents of attachment
- type - content type
 
Adds attachment to current step or test (when no current step)

```javascript
cy.allure().attachment('text.json', 'attachment body', 'text/plain');
```

### testAttachment
**testAttachment(name: string, content: Buffer | string, type: ContentType)**

- content - contents of attachment
- type - content type

Adds attachment to current test

```javascript
cy.allure().testAttachment('text.json', 'attachment body', 'text/plain');
```

### fileAttachment
**fileAttachment(name: string, file: string, type: ContentType)**

 - name attachment name
 - file -  path to file
 - type - content type

Adds file attachment to current step or test (when no current step)

```javascript
cy.allure().fileAttachment('text.json', 'reports/text.json', 'text/plain');
```

### testFileAttachment
**testFileAttachment(name: string, file: string, type: ContentType)**

 - name attachment name
 - file -  path to file
 - type - content type

Adds file attachment to current test

```javascript
cy.allure().testFileAttachment('text.json', 'reports/text.json', 'text/plain');
```


### addDescriptionHtml
**addDescriptionHtml(value: string)**

Adds HTML description. Will be shown in report in Description section for test.

Will concatenate all descriptions

```javascript
cy.allure().addDescriptionHtml('<b>description1</b>');
cy.allure().addDescriptionHtml('<b>description2</b>');
```
as result wil have description: 
```html
<b>description1</b>
<b>description2</b>
```


### writeEnvironmentInfo
**writeEnvironmentInfo(info: EnvironmentInfo)**
- info - dictionary with environment variables

Writes environment info file (environment.properties) into allure results path

Environment info will be shown in report on overview tab in Environment widget

```javascript
cy.allure().writeEnvironmentInfo({
    OS: 'ubuntu',
    commit: 'fix of defect 1'
 })
```

### writeExecutorInfo
**writeExecutorInfo(info: ExecutorInfo)**
- info -  executor info object

Writes executor info file (executor.json) into allure results path

```javascript
cy.allure().writeExecutorInfo({
  name: '1',
  type: 'wwew',
  url: 'http://build',
  buildOrder: 1,
  buildName: 'build name',
  buildUrl: 'http://build.url',
  reportUrl: 'http://report/1',
  reportName: 'report 1',
});
```


### writeCategoriesDefinitions
Writes categories definitions file (categories.json) into allure results path.

**writeCategoriesDefinitions(categories: Category[])**
- categories -  array oif categories


**writeCategoriesDefinitions(file: string)**
- file -  path to json file with categories


Categories will be shown in overview tab in Categories widget and on Categories tab in Report. 

Note that `messageRegex` and `traceRegex` are strings containing regular expressions, 
do not forget to escape the string properly.

It is better to write categories once for run, so use that in plugins:

```javascript
// plugins file
const reporter = configureAllureAdapterPlugins(on, config);
on('before:run', () => {
  reporter?.writeCategoriesDefinitions({ categories: [
      {
         name: 'exception with number',
         matchedStatuses: ['failed'],
         messageRegex: '.*\\d+.*',
         traceRegex: '.*',
      },
 ]});
});
```

or

```javascript
// plugins file
const reporter = configureAllureAdapterPlugins(on, config);
on('before:run', () => {
  // 'categories.json' file is in the root (where package.json located)
  reporter?.writeCategoriesDefinitions({ categories: 'categories.json' });
});
```


### deleteResults
**deleteResults()**

Delete allure-results

```javascript
cy.allure().deleteResults();
```

### Advanced

#### after:spec event
If you use Cypress action `after:spec` in plugins you
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
#### Before run

Some operations like writing environment information, execution info or categories definitions
should be done once for a run.

To do that you need to modify your setupNodeEvents function:
 ```javascript
   // cypress.config.ts
   import { configureAllureAdapterPlugins } from '@mmisty/cypress-allure-adapter/plugins';
   
   export default defineConfig({
     e2e: {
       setupNodeEvents(on, config) {
          const reporter = configureAllureAdapterPlugins(on, config);
          
          // after that you can use allure to make operations on cypress start,
          // or on before run start
          on('before:run', details => {
             reporter?.writeEnvironmentInfo({
                info: {
                   os: details.system.osName,
                   osVersion: details.system.osVersion,
                },
             });
          });
          
         return config;
       },
       // ...
     }
   });
   ```


#### Start/End test events
If you need to add labels, tags or other meta info for tests you can use the following additional events for Cypress.Allure interface:
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

## Troubleshooting

To see debug log run cypress with DEBUG env variable like: `DEBUG=cypress-allure* npm run cy:open`

## Change log
### 0.8.2
 - fix for wrapping custom commands that doesn't return anything but have subject

### 0.8.1 
 - fixes with attaching requests files
 - writeCategoriesDefinitions interface improved to allow file path instead of categories array as argument
 - ability to endStep with status

### 0.7.3
- custom commands logging (child commands will be grouped)

### 0.6.0
 - setting to disable warning about duplicates

### 0.5.0
 - fixes to attach videos by Allure TestOps
 - setting to attach videos only for unsuccessfull results
 - setting to attach requests

### 0.0.2 
Initial version