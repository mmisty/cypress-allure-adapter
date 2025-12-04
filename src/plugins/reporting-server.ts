import http from 'http';
import net from 'net';
import Debug from 'debug';
import { copyFile, mkdir, readFile, rm, writeFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { logWithPackage } from '../common';

const debug = Debug('cypress-allure:reporting-server');

export const REPORTING_SERVER_PORT_ENV = 'allureReportingServerPort';

type FileOperation =
  | { type: 'mkdir'; path: string; options?: { recursive?: boolean } }
  | { type: 'writeFile'; path: string; content: string; encoding?: BufferEncoding }
  | { type: 'copyFile'; from: string; to: string; removeSource?: boolean }
  | { type: 'removeFile'; path: string }
  | { type: 'custom'; id: string };

type OperationResult = { success: true; data?: unknown } | { success: false; error: string };

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
        tryPort(port + 1, attempts + 1);
      });
    };

    tryPort(startPort);
  });
};

/**
 * Reporting server that handles filesystem operations asynchronously.
 * Operations are queued without awaits (fire-and-forget), and at the end
 * you can wait for all operations to complete.
 */
export class ReportingServer {
  private server: http.Server | null = null;
  private port: number | null = null;

  // Queue management
  private queue: Array<{ operation: FileOperation; resolve: (result: OperationResult) => void }> = [];
  private isProcessing = false;
  private running = 0;
  private maxConcurrent: number;

  // Track pending operations for flush
  private pendingOperations: Promise<OperationResult>[] = [];

  // Custom operation handlers
  private customHandlers: Map<string, () => Promise<void>> = new Map();

  constructor(maxConcurrentOps = 10) {
    this.maxConcurrent = maxConcurrentOps;
  }

  async start(): Promise<number> {
    if (this.server) {
      return this.port!;
    }

    this.port = await findAvailablePort();

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();

          return;
        }

        if (req.method !== 'POST') {
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
            const operation: FileOperation = JSON.parse(body);
            const result = await this.enqueueAndProcess(operation);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: (err as Error).message }));
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
    // Wait for all pending operations
    await this.flush();

    return new Promise(resolve => {
      if (!this.server) {
        resolve();

        return;
      }

      this.server.close(() => {
        debug('Reporting server stopped');
        this.server = null;
        this.port = null;
        resolve();
      });
    });
  }

  getPort(): number | null {
    return this.port;
  }

  // ============ FIRE-AND-FORGET METHODS (no await needed) ============

  /**
   * Queue mkdir operation (fire and forget)
   */
  mkdir(path: string, options?: { recursive?: boolean }): void {
    this.queueOperation({ type: 'mkdir', path, options });
  }

  /**
   * Queue writeFile operation (fire and forget)
   */
  writeFile(path: string, content: string | Buffer): void {
    const contentStr = Buffer.isBuffer(content) ? content.toString('base64') : content;
    const encoding: BufferEncoding | undefined = Buffer.isBuffer(content) ? 'base64' : undefined;
    this.queueOperation({ type: 'writeFile', path, content: contentStr, encoding });
  }

  /**
   * Queue copyFile operation (fire and forget)
   */
  copyFile(from: string, to: string, removeSource = false): void {
    this.queueOperation({ type: 'copyFile', from, to, removeSource });
  }

  /**
   * Queue removeFile operation (fire and forget)
   */
  removeFile(path: string): void {
    this.queueOperation({ type: 'removeFile', path });
  }

  /**
   * Queue custom operation (fire and forget)
   */
  addOperation(fn: () => Promise<void>): void {
    const id = `custom_${Date.now()}_${Math.random()}`;
    this.customHandlers.set(id, fn);
    this.queueOperation({ type: 'custom', id });
  }

  // ============ SYNC/ASYNC METHODS (for reads that need results) ============

  /**
   * Check if file exists (sync - safe for quick checks before queueing)
   */
  existsSync(path: string): boolean {
    return existsSync(path);
  }

  /**
   * Check if file exists (async)
   */
  async exists(path: string): Promise<boolean> {
    try {
      await stat(path);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file (async - must be awaited)
   */
  async readFile(path: string): Promise<Buffer> {
    return readFile(path);
  }

  // ============ QUEUE MANAGEMENT ============

  private queueOperation(operation: FileOperation): void {
    const promise = this.enqueueAndProcess(operation);
    this.pendingOperations.push(promise);

    // Clean up resolved promises periodically
    promise.finally(() => {
      const index = this.pendingOperations.indexOf(promise);

      if (index > -1) {
        this.pendingOperations.splice(index, 1);
      }
    });
  }

  private enqueueAndProcess(operation: FileOperation): Promise<OperationResult> {
    return new Promise(resolve => {
      this.queue.push({ operation, resolve });
      debug(`Queued ${operation.type} operation, queue size: ${this.queue.length}`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 || this.running > 0) {
      // Start new operations up to max concurrent
      while (this.queue.length > 0 && this.running < this.maxConcurrent) {
        const item = this.queue.shift();

        if (item) {
          this.running++;
          this.executeOperation(item.operation)
            .then(result => item.resolve(result))
            .catch(err => item.resolve({ success: false, error: (err as Error).message }))
            .finally(() => {
              this.running--;
            });
        }
      }

      // Yield to event loop
      if (this.queue.length > 0 || this.running > 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    this.isProcessing = false;
  }

  private async executeOperation(operation: FileOperation): Promise<OperationResult> {
    debug(`Executing ${operation.type} operation`);

    try {
      switch (operation.type) {
        case 'mkdir': {
          if (!existsSync(operation.path)) {
            await mkdir(operation.path, { recursive: operation.options?.recursive ?? true });
          }

          return { success: true };
        }

        case 'writeFile': {
          const content =
            operation.encoding === 'base64' ? Buffer.from(operation.content, 'base64') : operation.content;
          await writeFile(operation.path, content);
          debug(`Wrote file: ${operation.path}`);

          return { success: true };
        }

        case 'copyFile': {
          await copyFile(operation.from, operation.to);
          debug(`Copied ${operation.from} to ${operation.to}`);

          if (operation.removeSource && operation.from !== operation.to) {
            try {
              await rm(operation.from);
            } catch {
              // Ignore removal errors
            }
          }

          return { success: true };
        }

        case 'removeFile': {
          try {
            await rm(operation.path, { recursive: true, force: true });
            debug(`Removed: ${operation.path}`);
          } catch {
            // Ignore removal errors
          }

          return { success: true };
        }

        case 'custom': {
          const handler = this.customHandlers.get(operation.id);

          if (handler) {
            await handler();
            this.customHandlers.delete(operation.id);
          }

          return { success: true };
        }

        default:
          return { success: false, error: 'Unknown operation type' };
      }
    } catch (err) {
      logWithPackage('error', `File operation ${operation.type} failed: ${(err as Error).message}`);

      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Wait for all queued operations to complete
   */
  async flush(): Promise<void> {
    debug(`Flushing ${this.pendingOperations.length} pending operations`);

    // Wait for all pending operations
    await Promise.all(this.pendingOperations);

    // Double check the queue is empty
    while (this.queue.length > 0 || this.running > 0 || this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    debug('All operations flushed');
  }

  /**
   * Get count of pending operations
   */
  get pendingCount(): number {
    return this.queue.length + this.running + this.pendingOperations.length;
  }
}

// Singleton instance
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
