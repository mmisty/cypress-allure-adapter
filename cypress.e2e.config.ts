import { defineConfig } from 'cypress';
import { commonConfig } from './cypress.config';

export default defineConfig({
  ...commonConfig,
  e2e: {
    ...commonConfig.e2e,
    specPattern: '**/v2/**/*.cy.ts',
    env: {
      ...(commonConfig.e2e?.env || {}),
    },
  },
});
