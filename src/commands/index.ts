import RequestTask = Cypress.RequestTask;
import AllureTaskArgs = Cypress.AllureTaskArgs;

export const registerCommands = () => {
  Cypress.Commands.add(
    'allure',
    <T extends RequestTask>(opts: { task: T; arg: AllureTaskArgs<T> }, cyOpts?: { log: boolean }) => {
      if (cyOpts?.log === undefined || cyOpts.log) {
        Cypress.log({ name: 'allure', message: opts.task });
      }

      const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;

      return cy.window({ log: false }).then(async () => {
        runner.emit('task', opts);

        return null;
      });
    },
  );
};
