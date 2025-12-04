#!/usr/bin/env node

/**
 * Standalone Filesystem Server for Allure Reporting
 *
 * This server runs as a separate process to handle all filesystem operations
 * asynchronously, preventing blocking of the main Cypress process.
 *
 * Usage:
 *   node fs-server-standalone.js [--port <port>]
 *
 * The server communicates via HTTP and handles operations like:
 *   - mkdir, writeFile, readFile, copyFile, removeFile, appendFile, exists
 *   - batch operations for efficiency
 *
 * When started, it outputs the port number to stdout for the parent process to capture.
 */

import http from 'http';
import net from 'net';
import Debug from 'debug';
import {
  mkdirAsync,
  writeFileAsync,
  appendFileAsync,
  readFileAsync,
  copyFileAsync,
  removeFileAsync,
  fileExistsAsync,
  existsSync,
} from './fs-async';
import { mkdirSync, rmSync } from 'fs';

const debug = Debug('cypress-allure:fs-server');
const debugOps = Debug('cypress-allure:fs-server:ops');

export const FS_SERVER_PATH = '/__allure_fs/';
export const FS_SERVER_HEALTH_PATH = '/__allure_fs_health/';
export const FS_SERVER_PORT_ENV = 'ALLURE_FS_SERVER_PORT';

/**
 * Filesystem operation types supported by the server
 */
export type FsOperation =
  | { type: 'mkdir'; path: string; options?: { recursive?: boolean } }
  | { type: 'writeFile'; path: string; content: string; encoding?: BufferEncoding }
  | { type: 'appendFile'; path: string; content: string }
  | { type: 'readFile'; path: string }
  | { type: 'copyFile'; from: string; to: string; removeSource?: boolean }
  | { type: 'removeFile'; path: string }
  | { type: 'exists'; path: string }
  | { type: 'mkdirSync'; path: string; options?: { recursive?: boolean } }
  | { type: 'removeFileSync'; path: string }
  | { type: 'existsSync'; path: string }
  | { type: 'batch'; operations: FsOperation[] }
  | { type: 'shutdown' };

export type FsOperationResult = { success: true; data?: unknown } | { success: false; error: string };

/**
 * Queue for filesystem operations with concurrency control
 */
class FsOperationQueue {
  private queue: Array<{
    operation: FsOperation;
    resolve: (result: FsOperationResult) => void;
  }> = [];

  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
  }

  async enqueue(operation: FsOperation): Promise<FsOperationResult> {
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
      const result = await this.executeOperation(item.operation);
      item.resolve(result);
    } catch (err) {
      item.resolve({
        success: false,
        error: (err as Error).message,
      });
    } finally {
      this.running--;
      // Process next items in queue
      setImmediate(() => this.processNext());
    }
  }

  private async executeOperation(operation: FsOperation): Promise<FsOperationResult> {
    debugOps(`Executing operation: ${operation.type}`);

    switch (operation.type) {
      case 'mkdir': {
        await mkdirAsync(operation.path, operation.options);

        return { success: true };
      }

      case 'mkdirSync': {
        try {
          mkdirSync(operation.path, operation.options);

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      case 'writeFile': {
        const content = operation.encoding === 'base64' ? Buffer.from(operation.content, 'base64') : operation.content;
        await writeFileAsync(operation.path, content);

        return { success: true };
      }

      case 'appendFile': {
        await appendFileAsync(operation.path, operation.content);

        return { success: true };
      }

      case 'readFile': {
        const data = await readFileAsync(operation.path);

        return { success: true, data: data.toString('base64') };
      }

      case 'copyFile': {
        await copyFileAsync(operation.from, operation.to, operation.removeSource);

        return { success: true };
      }

      case 'removeFile': {
        await removeFileAsync(operation.path);

        return { success: true };
      }

      case 'removeFileSync': {
        try {
          rmSync(operation.path, { recursive: true, force: true });

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      case 'exists': {
        const exists = await fileExistsAsync(operation.path);

        return { success: true, data: exists };
      }

      case 'existsSync': {
        const exists = existsSync(operation.path);

        return { success: true, data: exists };
      }

      case 'batch': {
        const results: FsOperationResult[] = [];

        for (const op of operation.operations) {
          const result = await this.executeOperation(op);
          results.push(result);

          if (!result.success) {
            // Continue with other operations even if one fails
            debug(`Batch operation failed: ${result.error}`);
          }
        }
        const allSuccess = results.every(r => r.success);

        if (allSuccess) {
          return { success: true, data: results };
        }

        return {
          success: false,
          error: 'Some batch operations failed',
        };
      }

      case 'shutdown': {
        return { success: true };
      }

      default:
        return {
          success: false,
          error: `Unknown operation type: ${(operation as FsOperation).type}`,
        };
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
 * Find an available port
 */
export const findAvailablePort = async (startPort = 46000): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number, attempts = 0): void => {
      if (attempts > 100) {
        reject(new Error('Could not find available port for FS server'));

        return;
      }

      const server = net.createServer();

      server.listen(port, () => {
        server.close(() => {
          resolve(port);
        });
      });

      server.on('error', () => {
        // Port in use, try next
        tryPort(port + 1, attempts + 1);
      });
    };

    tryPort(startPort);
  });
};

/**
 * Standalone Filesystem Server
 */
export class StandaloneFsServer {
  private server: http.Server | null = null;
  private operationQueue: FsOperationQueue;
  private port: number | null = null;
  private shutdownRequested = false;

  constructor(maxConcurrentOps = 10) {
    this.operationQueue = new FsOperationQueue(maxConcurrentOps);
  }

  async start(requestedPort?: number): Promise<number> {
    if (this.server) {
      return this.port!;
    }

    this.port = requestedPort ?? (await findAvailablePort());

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();

          return;
        }

        // Health check endpoint
        if (req.method === 'GET' && req.url === FS_SERVER_HEALTH_PATH) {
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

        if (req.method !== 'POST' || !req.url?.startsWith(FS_SERVER_PATH)) {
          res.writeHead(404);
          res.end('Not found');

          return;
        }

        // Parse request body
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const operation: FsOperation = JSON.parse(body);

            // Handle shutdown request
            if (operation.type === 'shutdown') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
              this.shutdownRequested = true;
              // Give time for response to be sent
              setTimeout(() => this.stop(), 100);

              return;
            }

            const result = await this.operationQueue.enqueue(operation);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            debug(`Error processing request: ${(err as Error).message}`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                error: (err as Error).message,
              }),
            );
          }
        });
      });

      this.server.on('error', err => {
        debug(`FS server error: ${err.message}`);
        reject(err);
      });

      this.server.listen(this.port, () => {
        debug(`FS server started on port ${this.port}`);
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

      // Wait for pending operations
      const waitForPending = async (): Promise<void> => {
        while (this.operationQueue.pendingCount > 0 || this.operationQueue.runningCount > 0) {
          debug(
            `Waiting for ${this.operationQueue.pendingCount} pending and ${this.operationQueue.runningCount} running operations`,
          );
          await new Promise(r => setTimeout(r, 100));
        }
      };

      waitForPending().then(() => {
        this.server!.close(() => {
          debug('FS server stopped');
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
export const runStandaloneServer = async (): Promise<void> => {
  const args = process.argv.slice(2);
  let port: number | undefined;

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
    }
  }

  const server = new StandaloneFsServer();

  try {
    const actualPort = await server.start(port);

    // Output port for parent process to capture
    // Using a specific format that can be parsed
    process.stdout.write(`FS_SERVER_PORT:${actualPort}\n`);

    // Handle termination signals
    const shutdown = async () => {
      debug('Received shutdown signal');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('disconnect', shutdown);

    // Keep the process alive
    debug('FS server running, waiting for requests...');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to start FS server: ${(err as Error).message}`);
    process.exit(1);
  }
};

// Run if this is the main module
if (require.main === module) {
  runStandaloneServer();
}
