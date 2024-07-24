const all = Cypress.Tools.extendSteps({
  hello: () => {
    // ignore
  },
  'do smth': (input: string) => {
    console.log('123');
    cy.log(input);

    return cy.wrap(1);
  },
  group: (body: () => any) => {
    body();
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      steps<T extends keyof typeof all>(input: T, ...args: Parameters<(typeof all)[T]>): ReturnType<(typeof all)[T]>;
    }
  }
}

export {};
