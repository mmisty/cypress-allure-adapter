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
      allureAttachRequests: true,
      allureCompactAttachments: 'false',
      allureResults: 'allure-results', // for test results to write
      allureResultsWatchPath: 'allure-results/watch', // for test ops to watch
      allureSkipCommands: '', // separated comma
      allureAddVideoOnPass: 'true',
      allureShowDuplicateWarn: 'true',

      tmsPrefix: 'http://jira',
      issuePrefix: 'http://jira/*',
    },

    setupNodeEvents(on, config) {
      setupPlugins(on, config);

      return config;
    },
  },
});
