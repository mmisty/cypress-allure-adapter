import { visitHtml } from '../../common/helper';

describe('test packages @allure @failOnPurpose', () => {
  beforeEach(() => {
    visitHtml();
  });

  describe('suite', () => {
    before(() => {
      cy.wrap(null).then(() => {
        throw new Error('Broken expect');
      });
    });

    it('step test with body and not', () => {
      cy.get('.navbar li a:visible').should('contain.text', 'Utilities');
    });

    it('check step is sync 2', () => {
      expect(0).eq(1);
    });
  });

  it('check step is sync1 ', () => {
    expect(0).eq(0);
  });
});
