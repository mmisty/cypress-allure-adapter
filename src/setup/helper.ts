import { Debugger } from 'debug';

export const logClient = (debug: Debugger) => {
  if (!Cypress.env('DEBUG')) {
    return () => {
      // noop
    };
  }

  debug.enabled = true;

  return (...args: any[]) => {
    // todo log namespace
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
