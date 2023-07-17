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
    env: {
      REDIRECT_BROWSER_LOG: true,
      allure: 'true',
      allureCleanResults: 'true',
      allureAttachRequests: false,
      allureResults: 'allure-results', // for test results to write
      // allureResultsWatchPath: 'allure-results-2', // for test ops to watch
      allureSkipCommands: 'wrap', // separated comma
      allureAddVideoOnPass: 'true',

      tmsPrefix: 'http://jira',
      issuePrefix: 'http://jira/*',
    },

    setupNodeEvents(on, config) {
      setupPlugins(on, config);

      return config;
    },
  },
});
