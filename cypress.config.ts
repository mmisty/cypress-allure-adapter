import { defineConfig } from 'cypress';
import { setupPlugins } from './integration/plugins';

const cypressFolder = 'integration';

export default defineConfig({
  e2e: {
    specPattern: `${cypressFolder}/e2e/**/*.(cy|test|spec).ts`,
    supportFile: `${cypressFolder}/support/index.ts`,
    downloadsFolder: `${cypressFolder}/downloads`,
    videosFolder: `${cypressFolder}/videos`,
    fixturesFolder: `${cypressFolder}/fixtures`,
    screenshotsFolder: `${cypressFolder}/screenshots`,
    trashAssetsBeforeRuns: true,
    video: true,

    reporter: 'lib/setup/allure-mocha-reporter.js',
    reporterOptions: {
      allureResults: 'allure-results',
    },

    setupNodeEvents(on, config) {
      setupPlugins(on, config);

      return config;
    },
  },
});
