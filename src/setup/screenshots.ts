import { logClient } from './helper';
import { basename, getContentType } from '../common';

const deb = 'cypress-allure:screenshots';

export const registerScreenshotHandler = () => {
  const originalHandler = (Cypress.Screenshot as any).onAfterScreenshot;
  const debug = logClient(deb);

  (Cypress.Screenshot as any).onAfterScreenshot = (_$el: unknown, ...args: { path: string }[]) => {
    debug('Screenshot handler');
    // testAttemptIndex, takenAt, name
    const [{ path }] = args;

    if (path) {
      // todo setting
      debug(`Attaching: ${path}`);
      Cypress.Allure.testFileAttachment(basename(path), path, getContentType(path));
    } else {
      debug(`No path: ${JSON.stringify(args)}`);
    }

    originalHandler(_$el, ...args);
  };
};
