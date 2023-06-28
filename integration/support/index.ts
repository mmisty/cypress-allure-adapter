import { allureAdapterSetup } from '../../src/setup';
import { COVERAGE } from '../common/constants';
import { registerCypressGrep } from '@mmisty/cypress-grep';

const setupCoverage = () => {
  if (Cypress.env(COVERAGE) === 'true' || Cypress.env(COVERAGE) === true) {
    console.log('ENABLE COV');
    require('@cypress/code-coverage/support');
  } else {
    console.log('COVERAGE NOT ENABLED IN BROWSER');
  }
};

registerCypressGrep({
  addControlToUI: true,
});

setupCoverage();
allureAdapterSetup();
