import http from 'http';
import net from 'net';
import Debug from 'debug';
import { logWithPackage } from '../common';
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
import { ReportingServerClient, startFsServerProcess, stopFsServerProcess } from './reporting-server-client';

const debug = Debug('cypress-allure:reporting-server');
const debugOps = Debug('cypress-allure:reporting-server:ops');

export const REPORTING_SERVER_PORT_ENV = 'allureReportingServerPort';
export const REPORTING_SERVER_PATH = '/__allure_reporting/';

/**
 * Filesystem operation types supported by the reporting server
 */
export type FsOperation =
  | { type: 'mkdir'; path: string; options?: { recursive?: boolean } }
  | { type: 'writeFile'; path: string; content: string; encoding?: BufferEncoding }
  | { type: 'appendFile'; path: string; content: string }
  | { type: 'readFile'; path: string }
  | { type: 'copyFile'; from: string; to: string; removeSource?: boolean }
  | { type: 'removeFile'; path: string }
  | { type: 'exists'; path: string }
  | { type: 'batch'; operations: FsOperation[] };

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

      case 'exists': {
        const exists = await fileExistsAsync(operation.path);

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
const findAvailablePort = async (startPort = 45000): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number, attempts = 0): void => {
      if (attempts > 50) {
        reject(new Error('Could not find available port for reporting server'));

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
 * Mode for the reporting server
 */
export type ReportingServerMode = 'local' | 'remote';

/**
 * Options for the reporting server
 */
export interface ReportingServerOptions {
  /**
   * Mode of operation:
   * - 'local': FS operations run in the same process (default, legacy behavior)
   * - 'remote': FS operations are proxied to a separate server process
   */
  mode?: ReportingServerMode;
  /**
   * Maximum concurrent operations (for local mode)
   */
  maxConcurrentOps?: number;
}

/**
 * Reporting server that handles all filesystem operations asynchronously
 *
 * Supports two modes:
 * - 'local': Operations run in the same process (legacy behavior)
 * - 'remote': Operations are proxied to a separate server process
 */
export class ReportingServer {
  private server: http.Server | null = null;
  private operationQueue: FsOperationQueue | null = null;
  private port: number | null = null;
  private mode: ReportingServerMode;
  private remoteClient: ReportingServerClient | null = null;
  private isStarted = false;
  private startPromise: Promise<number> | null = null;
  private startResolve: ((port: number) => void) | null = null;

  constructor(options?: ReportingServerOptions) {
    this.mode = options?.mode ?? 'local';

    if (this.mode === 'local') {
      this.operationQueue = new FsOperationQueue(options?.maxConcurrentOps ?? 10);
      // Local mode is immediately ready
      this.isStarted = true;
    }

    debug(`ReportingServer created in ${this.mode} mode`);
  }

  /**
   * Wait for the server to be ready
   * Returns immediately if already started or in local mode
   */
  async waitForReady(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    if (this.startPromise) {
      await this.startPromise;

      return;
    }

    // If not started yet, wait for it
    await new Promise<void>(resolve => {
      const checkReady = () => {
        if (this.isStarted) {
          resolve();
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    });
  }

  /**
   * Start the reporting server in remote mode
   * (spawns a separate process for FS operations)
   */
  async startRemote(): Promise<number> {
    if (this.mode !== 'remote') {
      throw new Error('Cannot start remote server in local mode');
    }

    if (this.isStarted) {
      return this.remoteClient?.getPort() ?? 0;
    }

    // If already starting, return existing promise
    if (this.startPromise) {
      return this.startPromise;
    }

    debug('Starting remote FS server process');

    // Create promise that resolves when server is ready
    this.startPromise = (async () => {
      this.remoteClient = await startFsServerProcess();
      this.isStarted = true;
      const port = this.remoteClient.getPort();
      logWithPackage('log', `Allure FS server running on port ${port} (separate process)`);

      if (this.startResolve) {
        this.startResolve(port ?? 0);
      }

      return port ?? 0;
    })();

    return this.startPromise;
  }

  /**
   * Start the HTTP server for local mode (legacy behavior)
   */
  async start(): Promise<number> {
    if (this.mode === 'remote') {
      return this.startRemote();
    }

    if (this.server) {
      return this.port!;
    }

    this.port = await findAvailablePort();

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();

          return;
        }

        if (req.method !== 'POST' || !req.url?.startsWith(REPORTING_SERVER_PATH)) {
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
            const result = await this.operationQueue!.enqueue(operation);

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
        logWithPackage('error', `Reporting server error: ${err.message}`);
        reject(err);
      });

      this.server.listen(this.port, () => {
        debug(`Reporting server started on port ${this.port}`);
        logWithPackage('log', `Allure reporting server running on port ${this.port}`);
        this.isStarted = true;
        resolve(this.port!);
      });
    });
  }

  async stop(): Promise<void> {
    if (this.mode === 'remote') {
      await stopFsServerProcess();
      this.remoteClient = null;
      this.isStarted = false;

      return;
    }

    return new Promise(resolve => {
      if (!this.server) {
        resolve();

        return;
      }

      // Wait for pending operations
      const waitForPending = async (): Promise<void> => {
        while (this.operationQueue && (this.operationQueue.pendingCount > 0 || this.operationQueue.runningCount > 0)) {
          debug(
            `Waiting for ${this.operationQueue.pendingCount} pending and ${this.operationQueue.runningCount} running operations`,
          );
          await new Promise(r => setTimeout(r, 100));
        }
      };

      waitForPending().then(() => {
        this.server!.close(() => {
          debug('Reporting server stopped');
          this.server = null;
          this.port = null;
          this.isStarted = false;
          resolve();
        });
      });
    });
  }

  getPort(): number | null {
    if (this.mode === 'remote') {
      return this.remoteClient?.getPort() ?? null;
    }

    return this.port;
  }

  getMode(): ReportingServerMode {
    return this.mode;
  }

  /**
   * Execute operation directly (for in-process usage)
   */
  async execute(operation: FsOperation): Promise<FsOperationResult> {
    // Wait for server to be ready in remote mode
    if (this.mode === 'remote') {
      await this.waitForReady();

      if (this.remoteClient) {
        return this.remoteClient.execute(operation);
      }

      return { success: false, error: 'Remote client not initialized' };
    }

    if (!this.operationQueue) {
      return { success: false, error: 'Operation queue not initialized' };
    }

    return this.operationQueue.enqueue(operation);
  }

  /**
   * Convenience methods for common operations
   */
  async mkdir(filePath: string, options?: { recursive?: boolean }): Promise<void> {
    if (this.mode === 'remote') {
      await this.waitForReady();

      if (this.remoteClient) {
        return this.remoteClient.mkdir(filePath, options);
      }
    }

    const result = await this.execute({ type: 'mkdir', path: filePath, options });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  mkdirSync(filePath: string, options?: { recursive?: boolean }): void {
    // Sync operations in remote mode: use local fallback if server not ready
    if (this.mode === 'remote' && this.isStarted && this.remoteClient) {
      return this.remoteClient.mkdirSync(filePath, options);
    }

    // Local fallback for sync operations
    mkdirSync(filePath, options);
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    if (this.mode === 'remote') {
      await this.waitForReady();

      if (this.remoteClient) {
        return this.remoteClient.writeFile(filePath, content);
      }
    }

    const contentStr = Buffer.isBuffer(content) ? content.toString('base64') : content;
    const encoding: BufferEncoding | undefined = Buffer.isBuffer(content) ? 'base64' : undefined;
    const result = await this.execute({ type: 'writeFile', path: filePath, content: contentStr, encoding });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async appendFile(filePath: string, content: string): Promise<void> {
    if (this.mode === 'remote') {
      await this.waitForReady();

      if (this.remoteClient) {
        return this.remoteClient.appendFile(filePath, content);
      }
    }

    const result = await this.execute({ type: 'appendFile', path: filePath, content });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    if (this.mode === 'remote') {
      await this.waitForReady();

      if (this.remoteClient) {
        return this.remoteClient.readFile(filePath);
      }
    }

    const result = await this.execute({ type: 'readFile', path: filePath });

    if (!result.success) {
      throw new Error(result.error);
    }

    return Buffer.from(result.data as string, 'base64');
  }

  async copyFile(from: string, to: string, removeSource = false): Promise<void> {
    if (this.mode === 'remote') {
      await this.waitForReady();

      if (this.remoteClient) {
        return this.remoteClient.copyFile(from, to, removeSource);
      }
    }

    const result = await this.execute({ type: 'copyFile', from, to, removeSource });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async removeFile(filePath: string): Promise<void> {
    if (this.mode === 'remote') {
      await this.waitForReady();

      if (this.remoteClient) {
        return this.remoteClient.removeFile(filePath);
      }
    }

    const result = await this.execute({ type: 'removeFile', path: filePath });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  removeFileSync(filePath: string): void {
    // Sync operations in remote mode: use local fallback if server not ready
    if (this.mode === 'remote' && this.isStarted && this.remoteClient) {
      return this.remoteClient.removeFileSync(filePath);
    }

    // Local fallback for sync operations
    rmSync(filePath, { recursive: true, force: true });
  }

  async exists(filePath: string): Promise<boolean> {
    if (this.mode === 'remote') {
      await this.waitForReady();

      if (this.remoteClient) {
        return this.remoteClient.exists(filePath);
      }
    }

    const result = await this.execute({ type: 'exists', path: filePath });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data as boolean;
  }

  /**
   * Sync check for existence (for initial checks before server is involved)
   * Uses local fallback in remote mode if server not ready yet
   */
  existsSync(filePath: string): boolean {
    // Sync operations in remote mode: use local fallback if server not ready
    if (this.mode === 'remote' && this.isStarted && this.remoteClient) {
      return this.remoteClient.existsSync(filePath);
    }

    // Local fallback for sync operations
    return existsSync(filePath);
  }

  /**
   * Batch multiple operations for efficiency
   */
  async batch(operations: FsOperation[]): Promise<FsOperationResult[]> {
    if (this.mode === 'remote') {
      await this.waitForReady();

      if (this.remoteClient) {
        return this.remoteClient.batch(operations);
      }
    }

    const result = await this.execute({ type: 'batch', operations });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data as FsOperationResult[];
  }
}

// Singleton instance for the reporting server
let reportingServerInstance: ReportingServer | null = null;

export const getReportingServer = (options?: ReportingServerOptions): ReportingServer => {
  if (!reportingServerInstance) {
    reportingServerInstance = new ReportingServer(options);
  }

  return reportingServerInstance;
};

export const startReportingServer = async (options?: ReportingServerOptions): Promise<ReportingServer> => {
  const server = getReportingServer(options);

  if (server.getMode() === 'remote') {
    await server.startRemote();
  } else {
    await server.start();
  }

  return server;
};

export const stopReportingServer = async (): Promise<void> => {
  if (reportingServerInstance) {
    await reportingServerInstance.stop();
    reportingServerInstance = null;
  }
};
