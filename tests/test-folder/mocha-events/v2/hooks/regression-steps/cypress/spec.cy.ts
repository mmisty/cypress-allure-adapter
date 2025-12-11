before('Global Setup Pass', () => {
  console.log('Setup');
  cy.allure().startStep('global setup').endStep();
});

before('Global Setup', () => {
  console.log('Setup');
  cy.allure().startStep('global setup2');
  cy.wrap(null).then(() => {
    throw new Error('Failed Before ALL step');
  });
  cy.allure().endStep();
});

after('Global teardown', () => {
  cy.allure().step('global teardown');
  console.log('Tear down');
});

describe('hooks test - failed global hook step', () => {
  before('Global Setup in suite', () => {
    console.log('Setup');
    cy.allure().startStep('global setup').endStep();
  });

  it('test 1', () => {
    cy.log('test 1');
  });

  it('test 2', () => {
    cy.log('test 2');
  });

  describe('more tests', () => {
    it('test 3', () => {
      cy.log('test 2');
    });
  });

  afterEach(() => {
    cy.log('log after each');
  });

  afterEach('Named after', () => {
    cy.log('log after each');
  });

  after(() => {
    cy.log('after');
  });

  after('named hook all after', () => {
    cy.log('after');
  });
});
