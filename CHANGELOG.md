## Change Log
### 0.12.5
- special tags integration - can use `@issue("ABC-123")`(and other meta tags like parentSuite, suite etc)
in title or in configuration object like
  ```javascript
  it("test", { tags: ['@issue("ABC-123")'] }, () => {
   // ...
  });
  ```
### 0.12.3
- [tech] update cypress 13.3.4
- fix of #59 issue
### 0.12.2
- small local dependancy issue
### 0.12.1
- [TestOps] watcher improvements - realtime results for all tests

### 0.12.0
 - [TestOps] watcher improvements - realtime results for passed tests

### 0.11.0
  - [#35] issue - add possibility to skip hooks by env var `allureSkipSteps`

### 0.10.7
  -  [#34] issue - fix for long assertions text missing [PR-36](https://github.com/mmisty/cypress-allure-adapter/pull/36)

### 0.10.6
  -  [#34] issue - missing assertions [PR-35](https://github.com/mmisty/cypress-allure-adapter/pull/35)

### 0.10.5
  - [fix] await for result to be written on test ending [PR-33](https://github.com/mmisty/cypress-allure-adapter/pull/33)

### 0.10.4
  -  fix descrtructuring video when no video results [PR-31](https://github.com/mmisty/cypress-allure-adapter/pull/31)

### 0.10.3
  - fix engines and support cypress versions > 11
    
### 0.10.1
  - fix attaching requests for cypress 13.x

### 0.10.0
  - added suite, parentSuite and subSuite to [interface](./docs/interface.md#suite)

### 0.9.0
 - [tech] update cypress version to 13.0.0, check that compatible

### 0.8.7
 - fix error `Cypress detected that you returned a promise from a command while also invoking one or more cy commands in that promise.` for commands that return promises (ex. `cypress-real-events` plugin)

### 0.8.6
- fix license field

### 0.8.5
 - added imports by ECMA2015 syntax like `import '@mmisty/cypress-allure-adapter'`

### 0.8.4
- environment variable to switch on and off cypress commands logging (`allureLogCyCommands: 'true'`)
- environment variable to wrap specific commands (allureWrapCustomCommands)
   - commands can be excluded by `allureWrapCustomCommands: '!qaId,!cust',` - all should have `!` before command name
   - or can be included `allureWrapCustomCommands: 'qaId'`
- requests improvements

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

