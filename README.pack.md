# `Your library name`

Library description

## Contribution
To contribute install pre-commit hooks by `npm run husky:install`. It will
install git pre-commit hooks - will be located in `.husky` folder

### Scripts

| script          | description                                                                                                                                                 |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `husky:install` | install precommit hooks                                                                                                                                     |
| `lint`          | lint code                                                                                                                                                   |
| `build`         | compile typescript by [tsconfig.build.json](./tsconfig.build.json)                                                                                            |
| `test`          | run all jest tests                                                                                                                                          |
| `test:cov`      | run all jest tests with coverage                                                                                                                            |
| `cy:open`       | start cypress in interactive mode                                                                                                                           |
| `cy:open:cov`   | start cypress in interactive mode with coverage                                                                                                             |
| `cy:run`        | run cypress tests                                                                                                                                           |
| `cy:run:cov`    | run cypress tests with coverage                                                                                                                             |
| `cov:merge`     | merge jest and cypress coverage results                                                                                                                     |
| `cov:jest`      | show html report for jest coverage                                                                                                                          |
| `cov:cy`        | show html report for cypress coverage                                                                                                                       |
| `cov`           | show html report for full coverage                                                                                                                          |
| `cov:check`     | check coverage by thresholds specified in [nyc.config.js](./nyc.config.js)                                                                                  |
| `pre`           | run all necessary scripts  (fmt, lint, build, tests and check cov)                                                                                          |
| `extract`       | should be run after tsc and after everything is staged. Extracts everything from 'lib' to root directory. This is required for nice imports in target library |
| `extract:undo`  | Be careful, commit everything you need before. Removes files and dirs that were extracted after `extract`                                                     |
| `try:pack`      | try to pack the library - will create archieve with library files                                                                                             |



