/**
 * Allure Task Client
 *
 * Client for communicating with the AllureTaskServer.
 * Supports both remote (separate process) and local (in-process) modes.
 */

import http from 'http';
import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import Debug from 'debug';
import { logWithPackage } from '../common';
import type { ServerOperation, OperationResult, FsOperation } from './allure-operations';
import { SERVER_PATH, SERVER_PORT_ENV } from './allure-operations';
import { findAvailablePort } from './allure-task-server';

const debug = Debug('cypress-allure:task-client');

/**
 * Mode for the task client
 */
export type TaskClientMode = 'local' | 'remote';

/**
 * Resolve the path to the server script
 */
const resolveServerScriptPath = (): string => {
  const jsPath = path.resolve(__dirname, 'allure-task-server.js');

  if (existsSync(jsPath)) {
    return jsPath;
  }

  const tsPath = path.resolve(__dirname, 'allure-task-server.ts');

  if (existsSync(tsPath)) {
    return tsPath;
  }

  return jsPath;
};

const needsTsNode = (scriptPath: string): boolean => {
  return scriptPath.endsWith('.ts');
};

/**
 * Allure Task Client
 */
export class AllureTaskClient {
  private port: number | null = null;
  private serverProcess: ChildProcess | null = null;
  private isConnected = false;
  private startPromise: Promise<number> | null = null;
  private mode: TaskClientMode;
  private maxRetries = 50;
  private retryDelay = 100;

  constructor(mode: TaskClientMode = 'remote') {
    this.mode = mode;
    debug(`AllureTaskClient created in ${mode} mode`);
  }

  getMode(): TaskClientMode {
    return this.mode;
  }

  /**
   * Start the server process (remote mode only)
   */
  async start(): Promise<number> {
    if (this.mode === 'local') {
      this.isConnected = true;

      return 0;
    }

    if (this.isConnected && this.port) {
      return this.port;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    debug('Starting task server process');

    this.startPromise = this.doStart();

    return this.startPromise;
  }

  private async doStart(): Promise<number> {
    const requestedPort = await findAvailablePort();

    return new Promise((resolve, reject) => {
      const serverScript = resolveServerScriptPath();
      const useTsNode = needsTsNode(serverScript);

      debug(`Starting server from: ${serverScript} (ts-node: ${useTsNode})`);

      const command = useTsNode ? 'npx' : 'node';

      const args = useTsNode
        ? ['ts-node', '--transpile-only', serverScript, '--port', String(requestedPort)]
        : [serverScript, '--port', String(requestedPort)];

      this.serverProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        detached: false,
        shell: process.platform === 'win32',
        env: process.env, // Pass all environment variables to child process (DEBUG, etc.)
      });

      let portResolved = false;
      let outputBuffer = '';

      this.serverProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        outputBuffer += output;
        debug(`Server stdout: ${output.trim()}`);

        const portMatch = outputBuffer.match(/ALLURE_SERVER_PORT:(\d+)/);

        if (portMatch && !portResolved) {
          portResolved = true;
          this.port = parseInt(portMatch[1], 10);
          debug(`Server started on port ${this.port}`);
          this.isConnected = true;
          process.env[SERVER_PORT_ENV] = String(this.port);
          logWithPackage('log', `Allure task server running on port ${this.port} (separate process)`);
          resolve(this.port);
        }
      });

      this.serverProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();

        // Forward server debug output to parent's stderr so it's visible
        // Debug package writes to stderr, so we forward it directly
        if (process.env.DEBUG?.includes('cypress-allure')) {
          process.stderr.write(output);
        } else {
          debug(`Server stderr: ${output.trim()}`);
        }
      });

      this.serverProcess.on('error', err => {
        debug(`Server process error: ${err.message}`);

        if (!portResolved) {
          reject(new Error(`Failed to start task server: ${err.message}`));
        }
      });

      this.serverProcess.on('exit', (code, signal) => {
        debug(`Server process exited: code=${code}, signal=${signal}`);
        this.isConnected = false;
        this.serverProcess = null;

        if (!portResolved) {
          reject(new Error(`Task server exited unexpectedly: code=${code}, signal=${signal}`));
        }
      });

      setTimeout(() => {
        if (!portResolved) {
          this.killServer();
          reject(new Error('Timeout waiting for task server to start'));
        }
      }, 15000);
    });
  }

  /**
   * Wait for the server to be ready
   */
  async waitForReady(): Promise<void> {
    if (this.mode === 'local' || this.isConnected) {
      return;
    }

    if (this.startPromise) {
      await this.startPromise;

      return;
    }

    // Wait for connection
    for (let i = 0; i < this.maxRetries; i++) {
      if (this.isConnected) {
        return;
      }
      await new Promise(r => setTimeout(r, this.retryDelay));
    }
  }

  private killServer(): void {
    if (this.serverProcess) {
      debug('Killing server process');

      try {
        this.serverProcess.kill('SIGTERM');
      } catch {
        // Ignore
      }
      this.serverProcess = null;
      this.isConnected = false;
    }
  }

  async stop(): Promise<void> {
    if (this.mode === 'local') {
      return;
    }

    if (this.isConnected && this.port) {
      try {
        await this.execute({ type: 'shutdown' });
      } catch {
        // Server might already be down
      }
    }

    await new Promise(r => setTimeout(r, 500));
    this.killServer();
    this.startPromise = null;
  }

  getPort(): number | null {
    return this.port;
  }

  /**
   * Execute an operation
   */
  async execute(operation: ServerOperation): Promise<OperationResult> {
    if (this.mode === 'local') {
      return this.executeLocal(operation);
    }

    await this.waitForReady();

    if (!this.port) {
      return { success: false, error: 'Not connected to task server' };
    }

    return this.executeRemote(operation);
  }

  private async executeRemote(operation: ServerOperation): Promise<OperationResult> {
    return new Promise(resolve => {
      const body = JSON.stringify(operation);

      const req = http.request(
        {
          hostname: 'localhost',
          port: this.port!,
          path: SERVER_PATH,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 60000,
        },
        res => {
          let responseBody = '';
          res.on('data', chunk => {
            responseBody += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(responseBody) as OperationResult);
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
   * Execute operation locally (for local mode)
   * This imports the server module and executes directly
   */
  private async executeLocal(operation: ServerOperation): Promise<OperationResult> {
    // Dynamic import to avoid loading server dependencies in remote mode
    // const { AllureTaskServer } = await import('./allure-task-server');

    // Create a temporary server instance for local execution
    // Note: This is not ideal but maintains compatibility
    // In production, remote mode should be used
    // const localServer = new AllureTaskServer();

    // For local mode, we execute operations directly without starting HTTP server
    // We need to access the internal execute function
    // Since we can't easily do that, we'll implement basic local execution here

    return this.executeLocalOperation(operation);
  }

  private async executeLocalOperation(operation: ServerOperation): Promise<OperationResult> {
    // Import fs operations
    const fs = await import('fs/promises');
    const fsSync = await import('fs');

    if (operation.type === 'shutdown' || operation.type === 'health') {
      return { success: true };
    }

    if (operation.type === 'batch') {
      const results: OperationResult[] = [];

      for (const op of operation.operations) {
        results.push(await this.executeLocalOperation(op));
      }
      const allSuccess = results.every(r => r.success);

      if (allSuccess) {
        return { success: true, data: results };
      }

      return { success: false, error: 'Some batch operations failed' };
    }

    // FS operations
    switch (operation.type) {
      case 'fs:mkdir':
        try {
          await fs.mkdir(operation.path, { recursive: operation.options?.recursive ?? true });

          return { success: true };
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === 'EEXIST') return { success: true };

          return { success: false, error: (err as Error).message };
        }

      case 'fs:mkdirSync':
        try {
          fsSync.mkdirSync(operation.path, operation.options);

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }

      case 'fs:writeFile':
        try {
          const content =
            operation.encoding === 'base64' ? Buffer.from(operation.content, 'base64') : operation.content;
          await fs.writeFile(operation.path, content);

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }

      case 'fs:appendFile':
        try {
          await fs.appendFile(operation.path, operation.content);

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }

      case 'fs:readFile':
        try {
          const data = await fs.readFile(operation.path);

          return { success: true, data: data.toString('base64') };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }

      case 'fs:copyFile':
        try {
          await fs.copyFile(operation.from, operation.to);

          if (operation.removeSource && operation.from !== operation.to) {
            try {
              await fs.rm(operation.from);
            } catch {
              /* ignore */
            }
          }

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }

      case 'fs:removeFile':
        try {
          await fs.rm(operation.path, { recursive: true, force: true });

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }

      case 'fs:removeFileSync':
        try {
          fsSync.rmSync(operation.path, { recursive: true, force: true });

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }

      case 'fs:exists':
        try {
          await fs.stat(operation.path);

          return { success: true, data: true };
        } catch {
          return { success: true, data: false };
        }

      case 'fs:existsSync':
        return { success: true, data: fsSync.existsSync(operation.path) };

      default:
        // For Allure operations in local mode, we'd need to import and call the implementations
        // For now, fall through to error
        return { success: false, error: `Local execution not supported for: ${operation.type}` };
    }
  }

  /**
   * Execute sync operation locally (no network)
   */
  private executeSyncLocal(operation: FsOperation): OperationResult {
    const fsSync = require('fs');

    switch (operation.type) {
      case 'fs:mkdirSync':
        try {
          fsSync.mkdirSync(operation.path, operation.options);

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }

      case 'fs:removeFileSync':
        try {
          fsSync.rmSync(operation.path, { recursive: true, force: true });

          return { success: true };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }

      case 'fs:existsSync':
        return { success: true, data: fsSync.existsSync(operation.path) };

      default:
        return { success: false, error: `Sync operation not supported: ${operation.type}` };
    }
  }

  /**
   * Execute sync operation (uses HTTP for remote, direct for local)
   */
  executeSync(operation: FsOperation): OperationResult {
    // Local mode - always execute locally
    if (this.mode === 'local') {
      return this.executeSyncLocal(operation);
    }

    // Remote mode but not connected - fallback to local
    if (!this.port || !this.isConnected) {
      return this.executeSyncLocal(operation);
    }

    // Try remote execution via curl
    try {
      const body = JSON.stringify(operation);

      const result = execSync(
        `curl -s -X POST -H "Content-Type: application/json" -d '${body.replace(/'/g, "\\'")}' http://localhost:${this.port}${SERVER_PATH}`,
        { encoding: 'utf-8', timeout: 5000 },
      );

      return JSON.parse(result);
    } catch {
      // Fallback to local on error
      return this.executeSyncLocal(operation);
    }
  }

  // ============================================================================
  // Convenience Methods (matching old ReportingServer interface)
  // ============================================================================

  async mkdir(filePath: string, options?: { recursive?: boolean }): Promise<void> {
    const result = await this.execute({ type: 'fs:mkdir', path: filePath, options });
    if (!result.success) throw new Error(result.error);
  }

  mkdirSync(filePath: string, options?: { recursive?: boolean }): void {
    const result = this.executeSync({ type: 'fs:mkdirSync', path: filePath, options });
    if (!result.success) throw new Error(result.error);
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    const contentStr = Buffer.isBuffer(content) ? content.toString('base64') : content;
    const encoding: BufferEncoding | undefined = Buffer.isBuffer(content) ? 'base64' : undefined;
    const result = await this.execute({ type: 'fs:writeFile', path: filePath, content: contentStr, encoding });
    if (!result.success) throw new Error(result.error);
  }

  async appendFile(filePath: string, content: string): Promise<void> {
    const result = await this.execute({ type: 'fs:appendFile', path: filePath, content });
    if (!result.success) throw new Error(result.error);
  }

  async readFile(filePath: string): Promise<Buffer> {
    const result = await this.execute({ type: 'fs:readFile', path: filePath });
    if (!result.success) throw new Error(result.error);

    return Buffer.from(result.data as string, 'base64');
  }

  async copyFile(from: string, to: string, removeSource = false): Promise<void> {
    const result = await this.execute({ type: 'fs:copyFile', from, to, removeSource });
    if (!result.success) throw new Error(result.error);
  }

  async removeFile(filePath: string): Promise<void> {
    const result = await this.execute({ type: 'fs:removeFile', path: filePath });
    if (!result.success) throw new Error(result.error);
  }

  removeFileSync(filePath: string): void {
    const result = this.executeSync({ type: 'fs:removeFileSync', path: filePath });
    if (!result.success) throw new Error(result.error);
  }

  async exists(filePath: string): Promise<boolean> {
    const result = await this.execute({ type: 'fs:exists', path: filePath });
    if (!result.success) throw new Error(result.error);

    return result.data as boolean;
  }

  existsSync(filePath: string): boolean {
    const result = this.executeSync({ type: 'fs:existsSync', path: filePath });
    if (!result.success) throw new Error(result.error);

    return result.data as boolean;
  }

  // ============================================================================
  // High-level Allure Operations
  // ============================================================================

  async attachVideo(allureResults: string, videoPath: string, allureAddVideoOnPass: boolean): Promise<void> {
    const result = await this.execute({
      type: 'allure:attachVideo',
      allureResults,
      videoPath,
      allureAddVideoOnPass,
    });
    if (!result.success) throw new Error(result.error);
  }

  async moveToWatch(allureResults: string, allureResultsWatch: string): Promise<void> {
    const result = await this.execute({
      type: 'allure:moveToWatch',
      allureResults,
      allureResultsWatch,
    });
    if (!result.success) throw new Error(result.error);
  }

  async attachScreenshots(
    allureResults: string,
    screenshots: Array<{
      testId: string | undefined;
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
  ): Promise<void> {
    const result = await this.execute({
      type: 'allure:attachScreenshots',
      allureResults,
      screenshots,
      allTests,
    });
    if (!result.success) throw new Error(result.error);
  }

  async copyScreenshot(allureResults: string, screenshotPath: string, targetName: string): Promise<void> {
    const result = await this.execute({
      type: 'allure:copyScreenshot',
      allureResults,
      screenshotPath,
      targetName,
    });
    if (!result.success) throw new Error(result.error);
  }

  async writeTestMessage(filePath: string, message: string): Promise<void> {
    const result = await this.execute({
      type: 'allure:writeTestMessage',
      path: filePath,
      message,
    });
    if (!result.success) throw new Error(result.error);
  }
}

// Singleton instance
let clientInstance: AllureTaskClient | null = null;

export const getAllureTaskClient = (mode?: TaskClientMode): AllureTaskClient => {
  if (!clientInstance) {
    clientInstance = new AllureTaskClient(mode ?? 'remote');
  }

  return clientInstance;
};

export const startAllureTaskServer = async (mode?: TaskClientMode): Promise<AllureTaskClient> => {
  const client = getAllureTaskClient(mode);
  await client.start();

  return client;
};

export const stopAllureTaskServer = async (): Promise<void> => {
  if (clientInstance) {
    await clientInstance.stop();
    clientInstance = null;
  }
};
