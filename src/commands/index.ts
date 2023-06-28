import axios from 'axios';
import RequestTask = Cypress.RequestTask;
import AllureTaskArgs = Cypress.AllureTaskArgs;

const backendRequest = async <T extends RequestTask>(task: T, arg: AllureTaskArgs<T>) => {
  const body = { task, arg };

  // todo find a way to use reporter in open mode, disable this for a while in open mode
  if (!Cypress.config('isInteractive')) {
    const makeReq = (body: unknown) => axios.post('http://localhost:3000/__cypress/messages', body);

    await makeReq(body)
      .then(function (response) {
        console.log('RESPN');
        console.log(response.data);
      })
      .catch(function (error) {
        console.log(`Error requesting: ${task}`);
        console.log(error);
      });
  }
};

export const registerCommands = () => {
  /**
   * Log node
   */
  Cypress.Commands.add('myLog', (message: string) => {
    Cypress.log({ name: 'myLog', message });
    cy.task('log', message);
  });

  Cypress.Commands.add('allure', async <T extends RequestTask>(opts: { task: T; arg: AllureTaskArgs<T> }) => {
    Cypress.log({ name: 'allure', message: opts.task });
    await backendRequest(opts.task, opts.arg);

    return null;
  });
};
