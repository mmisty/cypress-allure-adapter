export const wrapSessionCmd = () => {
  const sess = cy.session;

  (global as unknown as { cy: Cypress.cy }).cy.session = (id: string, ...args: unknown[]) => {
    if (`${Cypress.env('allureLogCyCommands')}` !== 'true') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      return sess(id, ...args);
    } else {
      cy.doSyncCommand(() => {
        Cypress.Allure.startStep(`session: ${id}`);
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      return sess(id, ...args).should(() => {
        Cypress.Allure.endStep();
      });
    }
  };
};
