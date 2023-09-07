// describe('parent suite', () => {
//   describe('child suite 1', () => {
//     describe('deep child suite', () => {
//       it('test 1', () => {
//         cy.allure().label('suite', 'SOMETHING');
//         cy.log('message');
//       });
//
//       it('test 2', () => {
//         cy.allure().label('suite', 'SOMETHING');
//         cy.log('message');
//       });
//     });
//
//     describe('other deep child suite', () => {
//       it('test 1', () => {
//         cy.allure().label('suite', 'SOMETHING');
//         cy.log('message');
//       });
//
//       it('test 2', () => {
//         cy.allure().label('suite', 'SOMETHING');
//         cy.log('message');
//       });
//
//       describe('the deepest suite', () => {
//         it('test 1', () => {
//           cy.allure().label('suite', 'SOMETHING');
//           cy.log('message');
//         });
//       });
//     });
//
//     it('test 3', () => {
//       cy.allure().label('suite', 'SOMETHING');
//       cy.log('message');
//     });
//   });
//
//   describe('child suite 2', () => {
//     it('test 4', () => {
//       cy.log('message');
//     });
//   });
//
//   it('other test 5', () => {
//     cy.log('message2');
//   });
// });

Cypress.Allure.on('test:started', test => {
  // Cypress.Allure.parentSuite(undefined);
  if (test.titlePath()[0]) {
    Cypress.Allure.parentSuite(test.titlePath()[0]);
  }

  if (test.titlePath()[1]) {
    Cypress.Allure.suite(test.titlePath()[1]);
  }

  if (test.titlePath()[2]) {
    Cypress.Allure.subSuite(test.titlePath()[2]);
  }
  // Cypress.Allure.suite(test.titlePath()[0]);
  // Cypress.Allure.subSuite(undefined);
});

describe('parsuite here', () => {
  describe('suite here', () => {
    describe('sub here', () => {
      it('test 1', () => {
        //cy.allure().suite('OTHER');
        cy.allure().subSuite('Sub');
        // cy.allure().suite('OTHER Suite');
        cy.log('message');
      });
    });
  });

  describe('diff suite', () => {
    describe('sub here', () => {
      it('test 2', () => {
        //cy.allure().suite('OTHER');
        //cy.allure().subSuite('Sub');
        //cy.allure().suite('OTHER Suite');
        cy.log('message');
      });
    });
  });
});
