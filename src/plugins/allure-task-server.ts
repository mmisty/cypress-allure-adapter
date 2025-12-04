#!/usr/bin/env node

/**
 * Allure Task Server
 *
 * Unified server that handles all Allure operations in a separate process:
 * - Filesystem operations (mkdir, writeFile, readFile, etc.)
 * - High-level Allure operations (attachVideo, moveToWatch, etc.)
 *
 * This prevents blocking the main Cypress process.
 */

import http from 'http';
import net from 'net';
import path, { basename, dirname } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { appendFile, copyFile, mkdir, readFile, rm, writeFile, stat } from 'fs/promises';
import glob from 'fast-glob';
import { parseAllure } from 'allure-js-parser';
import { randomUUID } from 'crypto';
import Debug from 'debug';
import type { FixtureResult, Status } from 'allure-js-commons';
import { Stage as AllureStage } from 'allure-js-commons';
import type {
  ServerOperation,
  OperationResult,
  FsOperation,
  AllureOperation,
  BatchOperation,
} from './allure-operations';
import { SERVER_PATH, SERVER_HEALTH_PATH } from './allure-operations';

const debug = Debug('cypress-allure:task-server');
const debugOps = Debug('cypress-allure:task-server:ops');

/**
 * Operation queue with concurrency control
 */
class OperationQueue {
  private queue: Array<{
    operation: ServerOperation;
    resolve: (result: OperationResult) => void;
  }> = [];

  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
  }

  async enqueue(operation: ServerOperation): Promise<OperationResult> {
    return new Promise(resolve => {
      this.queue.push({ operation, resolve });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const item = this.queue.shift();

    if (!item) {
      this.running--;

      return;
    }

    try {
      const result = await executeOperation(item.operation);
      item.resolve(result);
    } catch (err) {
      item.resolve({
        success: false,
        error: (err as Error).message,
      });
    } finally {
      this.running--;
      setImmediate(() => this.processNext());
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get runningCount(): number {
    return this.running;
  }
}

/**
 * Execute a filesystem operation
 */
async function executeFsOperation(op: FsOperation): Promise<OperationResult> {
  debugOps(`FS operation: ${op.type}`);

  switch (op.type) {
    case 'fs:mkdir': {
      if (existsSync(op.path)) {
        return { success: true };
      }

      for (let i = 0; i < 5; i++) {
        try {
          await mkdir(op.path, { recursive: op.options?.recursive ?? true });

          return { success: true };
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
            return { success: true };
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      return { success: true };
    }

    case 'fs:mkdirSync': {
      try {
        mkdirSync(op.path, op.options);

        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }

    case 'fs:writeFile': {
      const content = op.encoding === 'base64' ? Buffer.from(op.content, 'base64') : op.content;
      await writeFile(op.path, content);

      return { success: true };
    }

    case 'fs:appendFile': {
      await appendFile(op.path, op.content);

      return { success: true };
    }

    case 'fs:readFile': {
      const data = await readFile(op.path);

      return { success: true, data: data.toString('base64') };
    }

    case 'fs:copyFile': {
      await copyFile(op.from, op.to);

      if (op.removeSource && op.from !== op.to) {
        try {
          await rm(op.from);
        } catch {
          // Ignore removal errors
        }
      }

      return { success: true };
    }

    case 'fs:removeFile': {
      await rm(op.path, { recursive: true, force: true });

      return { success: true };
    }

    case 'fs:removeFileSync': {
      try {
        rmSync(op.path, { recursive: true, force: true });

        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }

    case 'fs:exists': {
      try {
        await stat(op.path);

        return { success: true, data: true };
      } catch {
        return { success: true, data: false };
      }
    }

    case 'fs:existsSync': {
      return { success: true, data: existsSync(op.path) };
    }

    default:
      return { success: false, error: `Unknown FS operation: ${(op as FsOperation).type}` };
  }
}

/**
 * Execute an Allure high-level operation
 */
async function executeAllureOperation(op: AllureOperation): Promise<OperationResult> {
  debugOps(`Allure operation: ${op.type}`);

  switch (op.type) {
    case 'allure:attachVideo': {
      return await attachVideoToContainers(op.allureResults, op.videoPath, op.allureAddVideoOnPass);
    }

    case 'allure:moveToWatch': {
      return await moveResultsToWatch(op.allureResults, op.allureResultsWatch);
    }

    case 'allure:attachScreenshots': {
      return await attachScreenshots(op.allureResults, op.screenshots, op.allTests);
    }

    case 'allure:copyScreenshot': {
      return await copyScreenshot(op.allureResults, op.screenshotPath, op.targetName);
    }

    case 'allure:writeTestMessage': {
      return await writeTestMessage(op.path, op.message);
    }

    default:
      return { success: false, error: `Unknown Allure operation: ${(op as AllureOperation).type}` };
  }
}

/**
 * Execute a batch of operations
 */
async function executeBatchOperation(op: BatchOperation): Promise<OperationResult> {
  const results: OperationResult[] = [];

  for (const subOp of op.operations) {
    const result = await executeOperation(subOp);
    results.push(result);
  }

  const allSuccess = results.every(r => r.success);

  if (allSuccess) {
    return { success: true, data: results };
  }

  return { success: false, error: 'Some batch operations failed' };
}

/**
 * Main operation dispatcher
 */
async function executeOperation(operation: ServerOperation): Promise<OperationResult> {
  if (operation.type === 'shutdown') {
    return { success: true };
  }

  if (operation.type === 'health') {
    return { success: true, data: { status: 'ok' } };
  }

  if (operation.type === 'batch') {
    return executeBatchOperation(operation);
  }

  if (operation.type.startsWith('fs:')) {
    return executeFsOperation(operation as FsOperation);
  }

  if (operation.type.startsWith('allure:')) {
    return executeAllureOperation(operation as AllureOperation);
  }

  return { success: false, error: `Unknown operation type: ${operation.type}` };
}

// ============================================================================
// High-level Allure Operations Implementation
// ============================================================================

/**
 * Attach video to test containers
 */
async function attachVideoToContainers(
  allureResults: string,
  videoPath: string,
  allureAddVideoOnPass: boolean,
): Promise<OperationResult> {
  try {
    debug(`attachVideoToContainers: ${videoPath}`);
    const ext = '.mp4';
    const specname = basename(videoPath, ext);

    // Check video exists
    try {
      await stat(videoPath);
    } catch {
      return { success: false, error: `Video does not exist: ${videoPath}` };
    }

    const res = parseAllure(allureResults);

    const tests = res
      .filter(t => (allureAddVideoOnPass ? true : t.status !== 'passed' && t.status !== 'skipped'))
      .map(t => ({
        path: t.labels.find((l: { name: string; value: string }) => l.name === 'path')?.value,
        id: t.uuid,
        fullName: t.fullName,
        parent: t.parent,
      }));

    const testsAttach = tests.filter(t => t.path && t.path.indexOf(specname) !== -1);

    const testsWithSameParent = Array.from(
      new Map(testsAttach.filter(test => test.parent).map(test => [test.parent?.uuid, test])).values(),
    );

    for (const test of testsWithSameParent) {
      if (!test.parent) {
        continue;
      }

      const containerFile = `${allureResults}/${test.parent.uuid}-container.json`;

      try {
        const contents = await readFile(containerFile);
        const uuid = randomUUID();
        const nameAttach = `${uuid}-attachment${ext}`;
        const newPath = path.join(allureResults, nameAttach);

        // Parse and update container
        const containerJSON = JSON.parse(contents.toString());

        const after: FixtureResult = {
          name: 'video',
          attachments: [
            {
              name: `${specname}${ext}`,
              type: 'video/mp4',
              source: nameAttach,
            },
          ],
          parameters: [],
          start: Date.now(),
          stop: Date.now(),
          status: 'passed' as Status,
          statusDetails: {},
          stage: AllureStage.FINISHED,
          steps: [],
        };

        if (!containerJSON.afters) {
          containerJSON.afters = [];
        }
        containerJSON.afters.push(after);

        // Copy video if not exists
        try {
          await stat(newPath);
        } catch {
          await copyFile(videoPath, newPath);
        }

        await writeFile(containerFile, JSON.stringify(containerJSON));
      } catch (err) {
        debug(`Error updating container: ${(err as Error).message}`);
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Move results to watch folder for TestOps
 */
async function moveResultsToWatch(allureResults: string, allureResultsWatch: string): Promise<OperationResult> {
  try {
    if (allureResults === allureResultsWatch) {
      return { success: true };
    }

    // Ensure watch directory exists
    if (!existsSync(allureResultsWatch)) {
      await mkdir(allureResultsWatch, { recursive: true });
    }

    // Helper to copy if source exists and target doesn't
    const copyIfNeeded = async (src: string, target: string, removeSource = false) => {
      try {
        await stat(src);

        try {
          await stat(target);

          // Target exists, skip or remove source
          if (removeSource && src !== target) {
            await rm(src);
          }
        } catch {
          // Target doesn't exist, copy
          await copyFile(src, target);

          if (removeSource && src !== target) {
            await rm(src);
          }
        }
      } catch {
        // Source doesn't exist, skip
      }
    };

    const targetPath = (src: string) => src.replace(allureResults, allureResultsWatch);

    // Copy environment, executor, categories
    await copyIfNeeded(
      `${allureResults}/environment.properties`,
      targetPath(`${allureResults}/environment.properties`),
      true,
    );
    await copyIfNeeded(`${allureResults}/executor.json`, targetPath(`${allureResults}/executor.json`), true);
    await copyIfNeeded(`${allureResults}/categories.json`, targetPath(`${allureResults}/categories.json`), true);

    // Parse and move tests
    const tests = parseAllure(allureResults);

    for (const test of tests) {
      const testSource = `${allureResults}/${test.uuid}-result.json`;
      const testTarget = targetPath(testSource);

      // Get parent container UUIDs
      const getAllParentUuids = (t: unknown) => {
        const uuids: string[] = [];
        let current = (t as { parent?: { uuid?: string; parent?: unknown } }).parent;

        while (current) {
          if (current.uuid) {
            uuids.push(current.uuid);
          }
          current = current.parent as { uuid?: string; parent?: unknown } | undefined;
        }

        return uuids;
      };

      const containerSources = getAllParentUuids(test).map(uuid => `${allureResults}/${uuid}-container.json`);

      // Find attachments referenced in test or containers
      const allAttachments = glob.sync(`${allureResults}/*-attachment.*`);
      let testContents = '';

      try {
        testContents = (await readFile(testSource)).toString();
      } catch {
        continue;
      }

      const containerContents: string[] = [];

      for (const containerSource of containerSources) {
        try {
          containerContents.push((await readFile(containerSource)).toString());
        } catch {
          // Skip
        }
      }

      const testAttachments = allAttachments.filter(attachFile => {
        const attachBasename = basename(attachFile);

        return (
          testContents.includes(attachBasename) || containerContents.some(content => content.includes(attachBasename))
        );
      });

      // Move attachments
      for (const attachFile of testAttachments) {
        const attachTarget = targetPath(attachFile);
        await copyIfNeeded(attachFile, attachTarget, true);
      }

      // Move test result
      await copyIfNeeded(testSource, testTarget, true);

      // Move containers
      for (const containerSource of containerSources) {
        const containerTarget = targetPath(containerSource);
        await copyIfNeeded(containerSource, containerTarget, true);
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Attach screenshots to test results
 */
async function attachScreenshots(
  allureResults: string,
  screenshots: Array<{
    testId?: string;
    path: string;
    testAttemptIndex?: number;
    specName?: string;
    testFailure?: boolean;
  }>,
  allTests: Array<{
    specRelative: string | undefined;
    fullTitle: string;
    uuid: string;
    mochaId: string;
    retryIndex: number | undefined;
    status?: string;
  }>,
): Promise<OperationResult> {
  try {
    for (const screenshot of screenshots) {
      const uuids = allTests
        .filter(
          t =>
            t.status !== 'passed' &&
            t.retryIndex === screenshot.testAttemptIndex &&
            basename(t.specRelative ?? '') === screenshot.specName &&
            (screenshot.testId ? t.mochaId === screenshot.testId : true),
        )
        .map(t => t.uuid);

      if (uuids.length === 0) {
        continue;
      }

      for (const uuid of uuids) {
        const testFile = `${allureResults}/${uuid}-result.json`;

        try {
          const contents = await readFile(testFile);
          const ext = path.extname(screenshot.path);
          const name = path.basename(screenshot.path);

          const testCon: { attachments: Array<{ name: string; type: string; source: string }> } = JSON.parse(
            contents.toString(),
          );
          const uuidNew = randomUUID();
          const nameAttach = `${uuidNew}-attachment${ext}`;
          const newPath = path.join(allureResults, nameAttach);

          // Copy screenshot if not exists
          try {
            await stat(newPath);
          } catch {
            await copyFile(screenshot.path, newPath);
          }

          if (!testCon.attachments) {
            testCon.attachments = [];
          }

          testCon.attachments.push({
            name: name,
            type: 'image/png',
            source: nameAttach,
          });

          await writeFile(testFile, JSON.stringify(testCon));
        } catch (err) {
          debug(`Could not attach screenshot: ${(err as Error).message}`);
        }
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Copy a screenshot to allure results
 */
async function copyScreenshot(
  allureResults: string,
  screenshotPath: string,
  targetName: string,
): Promise<OperationResult> {
  try {
    const targetPath = `${allureResults}/${targetName}`;

    // Ensure directory exists
    if (!existsSync(allureResults)) {
      await mkdir(allureResults, { recursive: true });
    }

    // Check source exists
    try {
      await stat(screenshotPath);
    } catch {
      return { success: false, error: `Screenshot does not exist: ${screenshotPath}` };
    }

    // Copy if target doesn't exist
    try {
      await stat(targetPath);
    } catch {
      await copyFile(screenshotPath, targetPath);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Write test message (for testing)
 */
async function writeTestMessage(filePath: string, message: string): Promise<OperationResult> {
  try {
    const dirPath = dirname(filePath);

    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    try {
      await stat(filePath);
    } catch {
      await writeFile(filePath, '');
    }

    await appendFile(filePath, `${message}\n`);

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// Server Implementation
// ============================================================================

/**
 * Find an available port
 */
export const findAvailablePort = async (startPort = 46000): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number, attempts = 0): void => {
      if (attempts > 100) {
        reject(new Error('Could not find available port for task server'));

        return;
      }

      const server = net.createServer();

      server.listen(port, () => {
        server.close(() => {
          resolve(port);
        });
      });

      server.on('error', () => {
        tryPort(port + 1, attempts + 1);
      });
    };

    tryPort(startPort);
  });
};

/**
 * Allure Task Server
 */
export class AllureTaskServer {
  private server: http.Server | null = null;
  private operationQueue: OperationQueue;
  private port: number | null = null;

  constructor(maxConcurrentOps = 10) {
    this.operationQueue = new OperationQueue(maxConcurrentOps);
  }

  async start(requestedPort?: number): Promise<number> {
    if (this.server) {
      return this.port!;
    }

    this.port = requestedPort ?? (await findAvailablePort());

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();

          return;
        }

        if (req.method === 'GET' && req.url === SERVER_HEALTH_PATH) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'ok',
              pending: this.operationQueue.pendingCount,
              running: this.operationQueue.runningCount,
            }),
          );

          return;
        }

        if (req.method !== 'POST' || !req.url?.startsWith(SERVER_PATH)) {
          res.writeHead(404);
          res.end('Not found');

          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const operation: ServerOperation = JSON.parse(body);

            if (operation.type === 'shutdown') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
              setTimeout(() => this.stop(), 100);

              return;
            }

            const result = await this.operationQueue.enqueue(operation);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            debug(`Error processing request: ${(err as Error).message}`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: (err as Error).message }));
          }
        });
      });

      this.server.on('error', err => {
        debug(`Task server error: ${err.message}`);
        reject(err);
      });

      this.server.listen(this.port, () => {
        debug(`Task server started on port ${this.port}`);
        resolve(this.port!);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise(resolve => {
      if (!this.server) {
        resolve();

        return;
      }

      const waitForPending = async (): Promise<void> => {
        while (this.operationQueue.pendingCount > 0 || this.operationQueue.runningCount > 0) {
          await new Promise(r => setTimeout(r, 100));
        }
      };

      waitForPending().then(() => {
        this.server!.close(() => {
          debug('Task server stopped');
          this.server = null;
          this.port = null;
          resolve();
        });
      });
    });
  }

  getPort(): number | null {
    return this.port;
  }
}

/**
 * Entry point when running as standalone script
 */
export const runServer = async (): Promise<void> => {
  const args = process.argv.slice(2);
  let port: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
    }
  }

  const server = new AllureTaskServer();

  try {
    const actualPort = await server.start(port);
    process.stdout.write(`ALLURE_SERVER_PORT:${actualPort}\n`);

    const shutdown = async () => {
      debug('Received shutdown signal');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('disconnect', shutdown);

    debug('Task server running, waiting for requests...');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to start task server: ${(err as Error).message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  runServer();
}
