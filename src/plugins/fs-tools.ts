import { existsSync, mkdirSync, rm } from 'fs';
import { copyFile, writeFile } from 'fs/promises';
import Debug from 'debug';
import { Attachment } from 'allure-js-commons';
import { basename, dirname } from 'path';
import { packageLog } from '../common';

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

export const copyFileCp = (from: string, to: string, isRemoveSource: boolean) => {
  log(`copy file ${from} to ${to}`);

  return copyFile(from, to)
    .then(() => {
      log(`Copied ${from} to ${to}`);

      if (isRemoveSource) {
        rm(from, () => {
          // ignore
        });
      }
    })
    .catch(err => {
      console.error(`${packageLog} Failed to copy ${from} to ${to}: ${err}`);
    });
};

export const copyAttachments = (
  allTasks: any[],
  attachments: Attachment[],
  watchPath: string,
  allureResultFile: string,
) => {
  const allureResults = dirname(allureResultFile);

  const attachCopyOperations = attachments.map(attach => {
    const attachTo = `${watchPath}/${attach.source}`;
    const attachFrom = `${allureResults}/${attach.source}`;

    return copyFileCp(attachFrom, attachTo, true);
  });

  allTasks.push(...attachCopyOperations);
};

export const copyTest = (allTasks: any[], testFile: string, watchPath: string) => {
  const to = `${watchPath}/${basename(testFile)}`;

  // do not remove for understanding how containers connected to tests
  const testCopyOperation = [copyFileCp(testFile, to, false)];
  allTasks.push(testCopyOperation);
};

export const writeResultFile = (resultContainer: string, content: string) => {
  return writeFile(resultContainer, content)
    .then(() => {
      log(`write test file done ${resultContainer} `);
    })
    .catch(err => {
      log(`error test file  ${err.message} `);
    });
};
