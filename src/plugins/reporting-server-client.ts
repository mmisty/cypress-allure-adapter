/**
 * Client for communicating with the standalone FS server
 *
 * This client implements the same interface as ReportingServer but
 * proxies all operations to a separate server process via HTTP.
 */

import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import Debug from 'debug';
import {
  FsOperation,
  FsOperationResult,
  FS_SERVER_PATH,
  FS_SERVER_HEALTH_PATH,
  FS_SERVER_PORT_ENV,
  findAvailablePort,
} from './fs-server-standalone';

// Re-export types for convenience
export type { FsOperation, FsOperationResult };

const debug = Debug('cypress-allure:reporting-client');

/**
 * Resolve the path to the FS server script
 * Handles both:
 * - Production: running from compiled JS in lib/
 * - Development/Tests: running from TypeScript source in src/
 */
const resolveServerScriptPath = (): string => {
  // Try compiled JS first (production)
  const jsPath = path.resolve(__dirname, 'fs-server-standalone.js');

  if (existsSync(jsPath)) {
    return jsPath;
  }

  // Try TypeScript source (development/tests) - need to compile on the fly
  const tsPath = path.resolve(__dirname, 'fs-server-standalone.ts');

  if (existsSync(tsPath)) {
    // Use ts-node to run TypeScript directly
    return tsPath;
  }

  // Fallback to JS path (will error if not found)
  return jsPath;
};

/**
 * Determine if we need ts-node to run the script
 */
const needsTsNode = (scriptPath: string): boolean => {
  return scriptPath.endsWith('.ts');
};

/**
 * Client for the standalone FS server
 */
export class ReportingServerClient {
  private port: number | null = null;
  private serverProcess: ChildProcess | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private maxRetries = 50;
  private retryDelay = 100; // ms

  constructor(private options?: { port?: number; startServer?: boolean }) {}

  /**
   * Start a new standalone FS server process
   */
  async startServer(): Promise<number> {
    if (this.serverProcess) {
      return this.port!;
    }

    debug('Starting standalone FS server process');

    const requestedPort = this.options?.port ?? (await findAvailablePort());

    return new Promise((resolve, reject) => {
      // Determine the path to the standalone server script
      const serverScript = resolveServerScriptPath();
      const useTsNode = needsTsNode(serverScript);

      debug(`Starting server from: ${serverScript} (ts-node: ${useTsNode})`);

      // Build the command based on whether we need ts-node
      const command = useTsNode ? 'npx' : 'node';

      const args = useTsNode
        ? ['ts-node', '--transpile-only', serverScript, '--port', String(requestedPort)]
        : [serverScript, '--port', String(requestedPort)];

      this.serverProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        detached: false,
        shell: process.platform === 'win32', // Use shell on Windows for npx
      });

      let portResolved = false;
      let outputBuffer = '';

      this.serverProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        outputBuffer += output;
        debug(`Server stdout: ${output.trim()}`);

        // Look for port announcement
        const portMatch = outputBuffer.match(/FS_SERVER_PORT:(\d+)/);

        if (portMatch && !portResolved) {
          portResolved = true;
          this.port = parseInt(portMatch[1], 10);
          debug(`Server started on port ${this.port}`);
          this.isConnected = true;

          // Set environment variable for other processes
          process.env[FS_SERVER_PORT_ENV] = String(this.port);

          resolve(this.port);
        }
      });

      this.serverProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        debug(`Server stderr: ${output.trim()}`);
      });

      this.serverProcess.on('error', err => {
        debug(`Server process error: ${err.message}`);

        if (!portResolved) {
          reject(new Error(`Failed to start FS server: ${err.message}`));
        }
      });

      this.serverProcess.on('exit', (code, signal) => {
        debug(`Server process exited: code=${code}, signal=${signal}`);
        this.isConnected = false;
        this.serverProcess = null;

        if (!portResolved) {
          reject(new Error(`FS server process exited unexpectedly: code=${code}, signal=${signal}`));
        }
      });

      // Timeout for server startup
      setTimeout(() => {
        if (!portResolved) {
          this.killServer();
          reject(new Error('Timeout waiting for FS server to start'));
        }
      }, 10000);
    });
  }

  /**
   * Connect to an existing standalone FS server
   */
  async connect(port: number): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.doConnect(port);

    return this.connectionPromise;
  }

  private async doConnect(port: number): Promise<void> {
    this.port = port;

    // Wait for server to be ready
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const health = await this.healthCheck();

        if (health.status === 'ok') {
          this.isConnected = true;
          debug(`Connected to FS server on port ${port}`);

          return;
        }
      } catch {
        // Server not ready yet
      }

      await new Promise(r => setTimeout(r, this.retryDelay));
    }

    throw new Error(`Could not connect to FS server on port ${port}`);
  }

  private async healthCheck(): Promise<{ status: string; pending: number; running: number }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: this.port!,
          path: FS_SERVER_HEALTH_PATH,
          method: 'GET',
          timeout: 2000,
        },
        res => {
          let body = '';
          res.on('data', chunk => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error('Invalid health response'));
            }
          });
        },
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
      req.end();
    });
  }

  /**
   * Kill the server process
   */
  killServer(): void {
    if (this.serverProcess) {
      debug('Killing server process');

      try {
        this.serverProcess.kill('SIGTERM');
      } catch {
        // Ignore errors
      }
      this.serverProcess = null;
      this.isConnected = false;
    }
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    if (!this.isConnected || !this.port) {
      this.killServer();

      return;
    }

    try {
      // Send shutdown request
      await this.execute({ type: 'shutdown' });
    } catch {
      // Server might already be down
    }

    // Wait a bit for graceful shutdown
    await new Promise(r => setTimeout(r, 500));
    this.killServer();
    this.connectionPromise = null;
  }

  getPort(): number | null {
    return this.port;
  }

  /**
   * Execute a filesystem operation via HTTP
   */
  async execute(operation: FsOperation): Promise<FsOperationResult> {
    if (!this.port) {
      return { success: false, error: 'Not connected to FS server' };
    }

    return new Promise(resolve => {
      const body = JSON.stringify(operation);

      const req = http.request(
        {
          hostname: 'localhost',
          port: this.port!,
          path: FS_SERVER_PATH,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 30000, // 30 second timeout
        },
        res => {
          let responseBody = '';
          res.on('data', chunk => {
            responseBody += chunk;
          });
          res.on('end', () => {
            try {
              const result = JSON.parse(responseBody) as FsOperationResult;
              resolve(result);
            } catch {
              resolve({ success: false, error: 'Invalid response from server' });
            }
          });
        },
      );

      req.on('error', err => {
        debug(`Request error: ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Convenience methods matching ReportingServer interface
   */
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const result = await this.execute({ type: 'mkdir', path, options });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  mkdirSync(filePath: string, options?: { recursive?: boolean }): void {
    // For sync operations, we need to make a synchronous HTTP call
    // This is a limitation - we'll use the async version and warn
    const result = this.executeSyncHttp({ type: 'mkdirSync', path: filePath, options });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    const contentStr = Buffer.isBuffer(content) ? content.toString('base64') : content;
    const encoding: BufferEncoding | undefined = Buffer.isBuffer(content) ? 'base64' : undefined;
    const result = await this.execute({ type: 'writeFile', path: filePath, content: contentStr, encoding });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async appendFile(filePath: string, content: string): Promise<void> {
    const result = await this.execute({ type: 'appendFile', path: filePath, content });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    const result = await this.execute({ type: 'readFile', path: filePath });

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

  async removeFile(filePath: string): Promise<void> {
    const result = await this.execute({ type: 'removeFile', path: filePath });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  removeFileSync(filePath: string): void {
    const result = this.executeSyncHttp({ type: 'removeFileSync', path: filePath });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const result = await this.execute({ type: 'exists', path: filePath });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data as boolean;
  }

  existsSync(filePath: string): boolean {
    const result = this.executeSyncHttp({ type: 'existsSync', path: filePath });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data as boolean;
  }

  async batch(operations: FsOperation[]): Promise<FsOperationResult[]> {
    const result = await this.execute({ type: 'batch', operations });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data as FsOperationResult[];
  }

  /**
   * Execute synchronous HTTP request (blocking)
   * This uses Node.js's synchronous approach with child_process
   */
  private executeSyncHttp(operation: FsOperation): FsOperationResult {
    if (!this.port) {
      return { success: false, error: 'Not connected to FS server' };
    }

    const { execSync } = require('child_process');
    const body = JSON.stringify(operation);

    try {
      // Use curl for synchronous HTTP request
      const result = execSync(
        `curl -s -X POST -H "Content-Type: application/json" -d '${body.replace(/'/g, "\\'")}' http://localhost:${this.port}${FS_SERVER_PATH}`,
        { encoding: 'utf-8', timeout: 5000 },
      );

      return JSON.parse(result);
    } catch (err) {
      // Fallback: execute operation directly (local fallback)
      debug(`Sync HTTP failed, falling back to local execution: ${(err as Error).message}`);

      return this.executeSyncFallback(operation);
    }
  }

  /**
   * Fallback for sync operations when HTTP fails
   */
  private executeSyncFallback(operation: FsOperation): FsOperationResult {
    const { mkdirSync, rmSync, existsSync } = require('fs');

    try {
      switch (operation.type) {
        case 'mkdirSync':
          mkdirSync(operation.path, operation.options);

          return { success: true };

        case 'removeFileSync':
          rmSync(operation.path, { recursive: true, force: true });

          return { success: true };

        case 'existsSync':
          return { success: true, data: existsSync(operation.path) };

        default:
          return { success: false, error: 'Unsupported sync operation' };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

// Singleton instance
let clientInstance: ReportingServerClient | null = null;

export const getReportingServerClient = (): ReportingServerClient => {
  if (!clientInstance) {
    clientInstance = new ReportingServerClient();
  }

  return clientInstance;
};

/**
 * Start a new FS server process and return the client
 */
export const startFsServerProcess = async (): Promise<ReportingServerClient> => {
  const client = getReportingServerClient();
  await client.startServer();

  return client;
};

/**
 * Connect to an existing FS server
 */
export const connectToFsServer = async (port: number): Promise<ReportingServerClient> => {
  const client = getReportingServerClient();
  await client.connect(port);

  return client;
};

/**
 * Stop the FS server
 */
export const stopFsServerProcess = async (): Promise<void> => {
  if (clientInstance) {
    await clientInstance.stop();
    clientInstance = null;
  }
};
