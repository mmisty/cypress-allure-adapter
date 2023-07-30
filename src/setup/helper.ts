import Debug from 'debug';

export const logClient = (namespace: string) => {
  const debug = Debug(namespace);

  const enabled =
    Cypress.env('DEBUG') &&
    (Cypress.env('DEBUG').indexOf('*') !== -1
      ? namespace.startsWith(Cypress.env('DEBUG').replace('*', ''))
      : namespace === Cypress.env('DEBUG'));
  debug.enabled = enabled;

  return (...args: any[]) => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      debug(JSON.stringify(...args));
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      debug(...args);
    }
  };
};
