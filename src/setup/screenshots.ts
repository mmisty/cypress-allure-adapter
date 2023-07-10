import { ContentType } from './../plugins/allure-types';
import Debug from 'debug';
import { logClient } from './helper';
import { extname } from '../common';

const debug = logClient(Debug('cypress-allure:screenshots'));

const basename = (path: string): string => {
  const slashIndex = path.lastIndexOf('/');

  if (slashIndex > 0) {
    return path.slice(slashIndex + 1);
  }

  return path;
};

export const getContentType = (file: string): ContentType => {
  const ext = extname(file).toLowerCase();

  switch (ext) {
    case '.png': {
      return ContentType.PNG;
    }
    case '.log':

    case '.txt': {
      return ContentType.TEXT;
    }

    case '.json': {
      return ContentType.JSON;
    }

    case '.htm':

    case '.html': {
      return ContentType.HTML;
    }

    case '.csv': {
      return ContentType.CSV;
    }

    case '.xml': {
      return ContentType.XML;
    }

    case '.jpeg':

    case '.jpg': {
      return ContentType.JPEG;
    }

    case '.mp4': {
      return ContentType.MP4;
    }

    case '.svg': {
      return ContentType.SVG;
    }

    case '.zip':

    case '.pdf': {
      return ContentType.ZIP;
    }

    case '.css': {
      return ContentType.CSS;
    }

    default: {
      return ContentType.ZIP;
    }
  }
};

export const registerScreenshotHandler = (allureReporter: Cypress.AllureReporter<void>) => {
  const originalHandler = (Cypress.Screenshot as any).onAfterScreenshot;

  (Cypress.Screenshot as any).onAfterScreenshot = (_$el: unknown, ...args: { path: string }[]) => {
    debug('Screenshot handler');
    // testAttemptIndex, takenAt, name
    const [{ path }] = args;

    if (path) {
      // todo setting
      debug(`Attaching: ${path}`);
      allureReporter.testFileAttachment(basename(path), path, getContentType(path));
    } else {
      debug(`No path: ${JSON.stringify(args)}`);
    }

    originalHandler(_$el, ...args);
  };
};
