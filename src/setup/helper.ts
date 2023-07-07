import Debug, { Debugger } from 'debug';

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

const log = logClient(Debug('cypress-allure:delay'));

export async function delay(ms: number, ...messages: string[]) {
  log([...messages, messages.length > 0 ? ':' : '', `DELAY ${ms.toString()} ms`]);
  await new Promise(resolve => setTimeout(resolve, ms));
}
