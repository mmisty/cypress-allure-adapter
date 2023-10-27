import { copyFile, existsSync, mkdirSync, rm, writeFile } from 'fs';
import Debug from 'debug';
import { delay, packageLog } from '../common';
import { Attachment } from 'allure-js-commons';
import { basename } from 'path';

const debug = Debug('cypress-allure:fs-tools');

const log = (...args: unknown[]) => {
  debug(args);
};

export const mkdirSyncWithTry = (dir: string) => {
  if (!existsSync(dir)) {
    for (let i = 0; i < 5; i++) {
      try {
        mkdirSync(dir);

        return;
      } catch (err) {
        // ignore
        log(`Could not create dir: ${(err as Error).message}`);
      }
    }
  }
};

export const copyFileCp = (from: string, to: string, isRemoveSource: boolean, callback: () => void) => {
  log(`copy file ${from} to ${to}`);

  copyFile(from, to, err => {
    if (err) {
      log(`Error copying file: ${err.message}`);

      return;
    }

    if (isRemoveSource) {
      rm(from, () => {
        // ignore
      });
    }

    callback();
  });
};

export const waitWhileCondition = async (whileCondition: () => boolean) => {
  const started = Date.now();
  const timeout = 10000;

  while (whileCondition()) {
    if (Date.now() - started >= timeout) {
      console.error(`${packageLog} Could not write all attachments in ${timeout}ms`);
      break;
    }
    await delay(100);
  }
};

export const copyAttachments = async (attachments: Attachment[], watchPath: string, allureResults: string) => {
  let attachsDone = 0;

  attachments.forEach(attach => {
    const attachTo = `${watchPath}/${attach.source}`;
    const attachFrom = `${allureResults}/${attach.source}`;
    copyFileCp(attachFrom, attachTo, true, () => {
      attachsDone = attachsDone + 1;
    });
  });

  await waitWhileCondition(() => attachsDone < attachments.length);
};

export const copyTest = async (testFile: string, watchPath: string) => {
  let testsDone = 0;
  const to = `${watchPath}/${basename(testFile)}`;

  // do not remove for understanding how containers connected to tests
  copyFileCp(testFile, to, false, () => {
    testsDone = testsDone + 1;
  });

  await waitWhileCondition(() => testsDone < 1);
};

export const writeResultFile = (resultContainer: string, content: string, callBack: () => void) => {
  writeFile(resultContainer, content, errWrite => {
    if (errWrite) {
      log(`error test file  ${errWrite.message} `);

      return;
    }
    log(`write test file done ${resultContainer} `);
    callBack();
  });
};
