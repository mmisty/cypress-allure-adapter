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
    chromeWebSecurity: false,
    videoUploadOnPasses: true,
    // report: true,
    //reporter: 'lib/setup/allure-mocha-reporter.js',
    // reporterOptions: {
    //   allureResults: 'allure-results',
    // },
    env: {
      REDIRECT_BROWSER_LOG: true,
      allure: 'true',
      allureCleanResults: 'true',
      allureResults: 'allure-results',
      allureSkipCommands: 'wrap', // separated comma
    },

    setupNodeEvents(on, config) {
      setupPlugins(on, config);

      return config;
    },
  },
});
