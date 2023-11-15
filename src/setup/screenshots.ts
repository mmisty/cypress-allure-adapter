import { logClient } from './helper';
import { basename, getContentType } from '../common';

const deb = 'cypress-allure:screenshots';

export const registerScreenshotHandler = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalHandler = (Cypress.Screenshot as any).onAfterScreenshot;
  const debug = logClient(deb);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Cypress.Screenshot as any).onAfterScreenshot = (_$el: unknown, ...args: { path: string }[]) => {
    debug('Screenshot handler');
    // testAttemptIndex, takenAt, name
    const [{ path }] = args;

    if (path) {
      debug(`Attaching: ${path}`);
      const win = window as unknown as { allureAttachToStep: boolean };

      if (win.allureAttachToStep) {
        console.log(path);
        Cypress.Allure.fileAttachment(basename(path), path, getContentType(path));
      } else {
        Cypress.Allure.testFileAttachment(basename(path), path, getContentType(path));
      }
    } else {
      debug(`No path: ${JSON.stringify(args)}`);
    }

    originalHandler(_$el, ...args);
  };
};
