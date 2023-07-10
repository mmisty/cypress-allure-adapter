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
The following commands available from tests: 


### Scripts

| script          | description                                                                                                                                                 |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `husky:install` | install precommit hooks                                                                                                                                     |
| `lint`          | lint code                                                                                                                                                   |
| `build`         | compile typescript by [tsconfig.build.json](./tsconfig.build.json)                                                                                            |
| `test`          | run all jest tests                                                                                                                                          |

## Troubleshooting

To see debug log run cypress with DEBUG env variable like: `DEBUG=cypress-allure* npm run cy:open`

## Change log

### 0.0.2 
Initial version