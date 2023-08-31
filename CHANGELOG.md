## Change Log
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