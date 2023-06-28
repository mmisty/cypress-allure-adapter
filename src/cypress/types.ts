// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-namespace
declare namespace Cypress {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Chainable {
    /**
     * Custom command for logging
     * @param message - message
     */
    myLog(message: string): Chainable<void>;
  }
}
