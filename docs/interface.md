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

### suite
**suite(name?: string)**

In most cases when you use `describe` plugin will automatically create correct 
structure of suites (Suite tab in report), but in some cases you may want to override that 
(or add when no describes are being used)

Adds suite to test (or overrides automatic name)
When name is `undefined` it will remove automatic label from test.

```javascript
cy.allure().suite('Suite name');
```

```javascript
cy.allure().suite();
```

### parentSuite
**parentSuite(name?: string)**

In most cases when you use `describe` plugin will automatically create correct
structure of suites (Suite tab in report), but in some cases you may want to override that
(or add when no describes are being used)

Adds parent suite to test (or overrides automatic name)

```javascript
cy.allure().parentSuite('Suite name');
```

```javascript
cy.allure().parentSuite();
```

### subSuite
**subSuite(name?: string)**

In most cases when you use `describe` plugin will automatically create correct
structure of suites (Suite tab in report), but in some cases you may want to override that
(or add when no describes are being used)

Adds sub suite to test (or overrides automatic name)

```javascript
cy.allure().subSuite('Suite name');
```

```javascript
cy.allure().subSuite();
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

### historyId
**historyId(value: string)**

Sets test historyId

historyId is entity on which Allure reporter decides whether test is retried or not

```javascript
cy.allure().historyId('<guid>');
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
cy.allure().testParameter('varA', 'bus');
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