import { defineConfig } from 'cypress';
import { setupPlugins } from '../../integration/plugins';
// eslint-disable-next-line no-restricted-imports
import '../../src/cypress/cypress'; // for types

const cypressFolder = '../../integration';
export const commonConfig: Cypress.ConfigOptions = {
  e2e: {
    specPattern: './e2e/**/*.cy.ts',
    supportFile: `${cypressFolder}/support/index.ts`,
    downloadsFolder: `${cypressFolder}/downloads`,
    videosFolder: `${cypressFolder}/videos`,
    fixturesFolder: `${cypressFolder}/fixtures`,
    screenshotsFolder: `${cypressFolder}/screenshots`,
    trashAssetsBeforeRuns: true,
    video: true,
    chromeWebSecurity: false,
    env: {
      REDIRECT_BROWSER_LOG: true,
      allure: 'true',
      allureCleanResults: 'true',
      allureAttachRequests: true,
      allureCompactAttachments: 'false',
      allureResults: 'allure-results', // for test results to write
      allureResultsWatchPath: 'allure-results/watch',
      allureSkipCommands: '', // separated comma
      // allureSkipSteps: '"after each" hook*,"before each" hook*,"before all" hook', // separated comma
      allureAddVideoOnPass: 'true',
      allureShowDuplicateWarn: 'true',
      allureShowTagsInTitle: false,
      allureAddNonSpecialTags: 'true',
      // allureWrapCustomCommands: '!qaId,!cust',
      // allureWrapCustomCommands: 'qaId,cust',
      // allureLogCyCommands: 'false',
      // allureAddBodiesToRequests: '**/hello,**',

      tmsPrefix: 'http://jira',
      issuePrefix: 'http://jira/*',
    },

    async setupNodeEvents(on, config) {
      await setupPlugins(on, config);

      return config;
    },
  },
};

export default defineConfig(commonConfig);
