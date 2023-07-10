# Cypress-allure-adapter

This is allure adapter for cypress providing realtime results. 
It is useful when using Allure TestOps - so you can watch tests execution.



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