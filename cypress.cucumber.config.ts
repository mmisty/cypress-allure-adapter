import { defineConfig } from 'cypress';
import { commonConfig } from './cypress.config';

export default defineConfig({
  ...commonConfig,
  e2e: {
    ...commonConfig.e2e,
    specPattern: 'integration/cucumber/**/**/*.feature',
    env: {
      ...(commonConfig.e2e?.env || {}),
      cucumber: 'true',
      omitFiltered: true,
      filterSpecs: true,
    },
  },
});
