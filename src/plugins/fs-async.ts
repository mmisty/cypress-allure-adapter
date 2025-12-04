import { copyFile, mkdir, readFile, rm, writeFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import Debug from 'debug';
import { logWithPackage } from '../common';

const debug = Debug('cypress-allure:fs-async');

const log = (...args: unknown[]) => {
  debug(args);
};

/**
 * Async filesystem operations to prevent blocking Cypress node events
 */

export const mkdirAsync = async (dir: string, options: { recursive?: boolean } = {}): Promise<void> => {
  if (existsSync(dir)) {
    return;
  }

  for (let i = 0; i < 5; i++) {
    try {
      await mkdir(dir, { recursive: options.recursive ?? true });

      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        return;
      }
      log(`Could not create dir (attempt ${i + 1}): ${(err as Error).message}`);
      // Small delay before retry
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
};

export const writeFileAsync = async (filePath: string, content: string | Buffer): Promise<void> => {
  try {
    await writeFile(filePath, content);
    log(`Wrote file: ${filePath}`);
  } catch (err) {
    logWithPackage('error', `Failed to write file ${filePath}: ${(err as Error).message}`);
    throw err;
  }
};

export const readFileAsync = async (filePath: string): Promise<Buffer> => {
  try {
    const content = await readFile(filePath);
    log(`Read file: ${filePath}`);

    return content;
  } catch (err) {
    logWithPackage('error', `Failed to read file ${filePath}: ${(err as Error).message}`);
    throw err;
  }
};

export const copyFileAsync = async (from: string, to: string, removeSource = false): Promise<void> => {
  log(`Copy file ${from} to ${to}`);

  try {
    await copyFile(from, to);
    log(`Copied ${from} to ${to}`);

    if (removeSource && from !== to) {
      try {
        await rm(from);
      } catch (rmErr) {
        // Ignore removal errors
        log(`Could not remove source file ${from}: ${(rmErr as Error).message}`);
      }
    }
  } catch (err) {
    logWithPackage('error', `Failed to copy ${from} to ${to}: ${(err as Error).message}`);
    throw err;
  }
};

export const removeFileAsync = async (filePath: string): Promise<void> => {
  try {
    await rm(filePath, { recursive: true, force: true });
    log(`Removed: ${filePath}`);
  } catch (err) {
    log(`Could not remove ${filePath}: ${(err as Error).message}`);
  }
};

export const fileExistsAsync = async (filePath: string): Promise<boolean> => {
  try {
    await stat(filePath);

    return true;
  } catch {
    return false;
  }
};

// Re-export existsSync for cases where sync check is acceptable (before async operations begin)
export { existsSync };
