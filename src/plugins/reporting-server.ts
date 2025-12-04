import http from 'http';
import net from 'net';
import Debug from 'debug';
import { logWithPackage } from '../common';
import {
  mkdirAsync,
  writeFileAsync,
  readFileAsync,
  copyFileAsync,
  removeFileAsync,
  fileExistsAsync,
  existsSync,
} from './fs-async';

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
 * Reporting server that handles all filesystem operations asynchronously
 */
export class ReportingServer {
  private server: http.Server | null = null;
  private operationQueue: FsOperationQueue;
  private port: number | null = null;

  constructor(maxConcurrentOps = 10) {
    this.operationQueue = new FsOperationQueue(maxConcurrentOps);
  }

  async start(): Promise<number> {
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
        logWithPackage('error', `Reporting server error: ${err.message}`);
        reject(err);
      });

      this.server.listen(this.port, () => {
        debug(`Reporting server started on port ${this.port}`);
        logWithPackage('log', `Allure reporting server running on port ${this.port}`);
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
          debug('Reporting server stopped');
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

  /**
   * Execute operation directly (for in-process usage)
   */
  async execute(operation: FsOperation): Promise<FsOperationResult> {
    return this.operationQueue.enqueue(operation);
  }

  /**
   * Convenience methods for common operations
   */
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const result = await this.execute({ type: 'mkdir', path, options });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async writeFile(path: string, content: string | Buffer): Promise<void> {
    const contentStr = Buffer.isBuffer(content) ? content.toString('base64') : content;
    const encoding: BufferEncoding | undefined = Buffer.isBuffer(content) ? 'base64' : undefined;
    const result = await this.execute({ type: 'writeFile', path, content: contentStr, encoding });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async readFile(path: string): Promise<Buffer> {
    const result = await this.execute({ type: 'readFile', path });

    if (!result.success) {
      throw new Error(result.error);
    }

    return Buffer.from(result.data as string, 'base64');
  }

  async copyFile(from: string, to: string, removeSource = false): Promise<void> {
    const result = await this.execute({ type: 'copyFile', from, to, removeSource });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async removeFile(path: string): Promise<void> {
    const result = await this.execute({ type: 'removeFile', path });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async exists(path: string): Promise<boolean> {
    const result = await this.execute({ type: 'exists', path });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data as boolean;
  }

  /**
   * Sync check for existence (for initial checks before server is involved)
   */
  existsSync(path: string): boolean {
    return existsSync(path);
  }

  /**
   * Batch multiple operations for efficiency
   */
  async batch(operations: FsOperation[]): Promise<FsOperationResult[]> {
    const result = await this.execute({ type: 'batch', operations });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data as FsOperationResult[];
  }
}

// Singleton instance for the reporting server
let reportingServerInstance: ReportingServer | null = null;

export const getReportingServer = (): ReportingServer => {
  if (!reportingServerInstance) {
    reportingServerInstance = new ReportingServer();
  }

  return reportingServerInstance;
};

export const startReportingServer = async (): Promise<ReportingServer> => {
  const server = getReportingServer();
  await server.start();

  return server;
};

export const stopReportingServer = async (): Promise<void> => {
  if (reportingServerInstance) {
    await reportingServerInstance.stop();
    reportingServerInstance = null;
  }
};
