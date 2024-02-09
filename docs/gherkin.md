## Gherkin support

This plugin supports gherkin support.

If you use `@badeball/cypress-cucumber-preprocessor` plugin
then also there would be tags support available.

Special tags will add meta info to report.

Example(in this example it will add several links to test):
```gherkin
@issue("ABC-001")
@tms("ABC-002")
@tms("ABC-003","Description__of__ticket")
Scenario: should have several tms tags
Given I log message "test"
```

Special tags are the same as allure interface items, see [interface](./interface.md)


**Note**
When using `@bahmutov/cypress-esbuild-preprocessor` to preprocess feature files
please update code to use globals:

```javascript
const cucumberBundler = createBundler({
    define: { global: 'window' },
    plugins: [createEsbuildPlugin(config)],
});
```
Example of setup is in progress
