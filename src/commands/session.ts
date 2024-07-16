export const wrapSessionCmd = () => {
  const sess = cy.session;

  (global as unknown as { cy: Cypress.cy }).cy.session = (id, setup, options, ...args: unknown[]) => {
    if (`${Cypress.env('allureLogCyCommands')}` === 'true' || Cypress.env('allureLogCyCommands') === undefined) {
      cy.doSyncCommand(() => {
        Cypress.Allure.startStep(`session${typeof id === 'string' ? `: ${id}` : ''}`);
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return sess(id, setup, options, ...args).doSyncCommand(() => {
        Cypress.Allure.endStep();
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return sess(id, setup, options, ...args);
    }
  };
};
