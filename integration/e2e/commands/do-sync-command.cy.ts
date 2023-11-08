describe('suite', () => {
  describe('should pass', () => {
    beforeEach(() => {
      cy.intercept('mytest.com**', {
        body: `<html>
            <head></head>
          <body>
          <a href="#2" data-qa-id="link-2">My link</a>
          <a href="#3" data-qa-id="link-3">My link 3</a>
          </body>
          </html>
          `,
      });

      cy.visit('mytest.com');
    });

    it('should click when added during chain (no custom commands)', () => {
      cy.get('[data-qa-id=link-2]')
        .doSyncCommand(s => {
          expect(s.text()).eq('My link');
        })
        .click();
    });

    it('should click when added during chain', () => {
      cy.qaId('link-2')
        .doSyncCommand(s => {
          expect(s.text()).eq('My link');
        })
        .click();
    });

    it('should click when added during chain (several)', () => {
      cy.qaId('link-2')
        .doSyncCommand(s => {
          expect(s.text()).eq('My link');
        })
        .doSyncCommand(s => {
          expect(s.text()).eq('My link');
        })
        .click();
    });

    it('should succeed when added before should', () => {
      cy.qaId('link-60')
        .doSyncCommand(() => {
          console.log('hello');
        })
        .should('not.exist');
    });

    it('should succeed when cy commands inside', () => {
      cy.qaId('link-60')
        .doSyncCommand(s => {
          cy.log('hello');
          cy.wrap(s);
        })
        .should('not.exist');
    });

    it('should succeed when between cy commands with cy commands inside', () => {
      cy.get('body')
        .find('a')
        .doSyncCommand(s => {
          cy.log('hello');
          cy.wrap(s, { log: false });
        })
        .eq(1)
        .should('have.text', 'My link 3');
    });
  });
});
