const all = Cypress.Tools.extendSteps({
  'hello again': () => {
    // ignore
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
