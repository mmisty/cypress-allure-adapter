import { checkCyResults, createResTest2 } from '@test-utils';

describe('test debug log event', () => {
  describe('debug true', () => {
    const res = createResTest2(
      [
        `
describe('test duration', () => {
  it('hello test', () => {
    cy.log('3000');
  });
  
});
`,
      ],
      { DEBUG: 'cypress-allure:server:messa*' },
    );

    describe('check results', () => {
      it('check cypress results', () => {
        checkCyResults(res?.result?.res, { totalPassed: 1 });
      });
    });
  });

  describe('debug specific logger', () => {
    const res = createResTest2(
      [
        `
describe('test duration', () => {
  it('hello test', () => {
    cy.log('3000');
  });
  
});
`,
      ],
      { DEBUG: 'cypress-allure:mocha-events' },
    );

    describe('check results', () => {
      it('check cypress results', () => {
        checkCyResults(res?.result?.res, { totalPassed: 1 });
      });
    });
  });
  describe('debug not matched logger', () => {
    const res = createResTest2(
      [
        `
describe('test duration', () => {
  it('hello test', () => {
    cy.log('3000');
  });
  
});
`,
      ],
      { DEBUG: 'cypress-allure-123' },
    );

    describe('check results', () => {
      it('check cypress results', () => {
        checkCyResults(res?.result?.res, { totalPassed: 1 });
      });
    });
  });

  describe('debug undefined', () => {
    const res = createResTest2(
      [
        `
describe('test duration', () => {
  it('hello test', () => {
    cy.log('3000');
  });
  
});
`,
      ],
      { DEBUG: undefined },
    );

    describe('check results', () => {
      it('check cypress results', () => {
        checkCyResults(res?.result?.res, { totalPassed: 1 });
      });
    });
  });
});
