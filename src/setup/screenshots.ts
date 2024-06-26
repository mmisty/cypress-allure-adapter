import { logClient } from './helper';
import { basename, getContentType } from '../common';
import { MessageManager } from '../setup/websocket';
import type { AutoScreen } from '../plugins/allure-types';

const deb = 'cypress-allure:screenshots';

export const registerScreenshotHandler = (message: MessageManager, testMsg: (msg: string) => void) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalHandler = (Cypress.Screenshot as any).onAfterScreenshot;
  const debug = logClient(deb);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Cypress.Screenshot as any).onAfterScreenshot = (_$el: unknown, ...args: AutoScreen[]) => {
    debug('Screenshot handler');
    // testAttemptIndex, takenAt, name, specName, testFailure
    const [screensArgs] = args;
    const [{ path }] = args;

    if (path) {
      const win = window as unknown as { allureAttachToStep: boolean };

      if (win.allureAttachToStep) {
        debug(`Attaching to step: ${path}`);
        message.message({
          task: 'screenshotAttachment',
          arg: screensArgs,
        });
        Cypress.Allure.fileAttachment(basename(path), path, getContentType(path));
        testMsg(`cypress:screenshot:${basename(path)}`);
      } else {
        debug(`Attaching to test: ${path}`);
        message.message({
          task: 'screenshotAttachment',
          arg: screensArgs,
        });
        Cypress.Allure.testFileAttachment(basename(path), path, getContentType(path));
        testMsg(`cypress:screenshot:test:${basename(path)}`);
      }
    } else {
      debug(`No path: ${JSON.stringify(args)}`);
    }

    originalHandler(_$el, ...args);
  };
};
