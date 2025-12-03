import { existsSync, mkdirSync, rm } from 'fs';
import { copyFile, writeFile } from 'fs/promises';
import Debug from 'debug';
import type { Attachment } from 'allure-js-commons';
import { basename, dirname } from 'path';
import { logWithPackage } from '../common';

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

export const copyFileCp = async (from: string, to: string, isRemoveSource: boolean) => {
  log(`copy file ${from} to ${to}`);

  await copyFile(from, to)
    .then(() => {
      log(`Copied ${from} to ${to}`);

      if (isRemoveSource && from !== to) {
        rm(from, () => {
          // ignore
        });
      }
    })
    .catch(err => {
      logWithPackage('error', `Failed to copy ${from} to ${to}: ${err}`);
    });
};

export const copyAttachments = async (attachments: Attachment[], watchPath: string, allureResultFile: string) => {
  const allureResults = dirname(allureResultFile);

  for (const attach of attachments) {
    const attachTo = `${watchPath}/${attach.source}`;
    const attachFrom = `${allureResults}/${attach.source}`;

    await copyFileCp(attachFrom, attachTo, true);
  }
};

export const copyTest = async (testFile: string, watchPath: string) => {
  const to = `${watchPath}/${basename(testFile)}`;

  // do not remove for understanding how containers connected to tests
  await copyFileCp(testFile, to, false);
};

export const writeResultFile = async (resultContainer: string, content: string) => {
  return writeFile(resultContainer, content)
    .then(() => {
      log(`write test file done ${resultContainer} `);
    })
    .catch(err => {
      log(`error test file  ${err.message} `);
    });
};
