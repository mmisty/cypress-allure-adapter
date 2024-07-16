export const wrapSessionCmd = () => {
  const sess = cy.session;

  (global as unknown as { cy: Cypress.cy }).cy.session = (id: string, ...args: unknown[]) => {
    if (`${Cypress.env('allureLogCyCommands')}` === 'true' || Cypress.env('allureLogCyCommands') === undefined) {
      cy.doSyncCommand(() => {
        Cypress.Allure.startStep(`session: ${id}`);
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      return sess(id, ...args).should(() => {
        Cypress.Allure.endStep();
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      return sess(id, ...args);
    }
  };
};
