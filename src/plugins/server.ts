import PluginConfigOptions = Cypress.PluginConfigOptions;
import { RawData, WebSocketServer } from 'ws';
import net from 'net';
import { ENV_WS, logWithPackage, wsPath } from '../common';
import Debug from 'debug';
import { AllureTasks, RequestTask } from '../plugins/allure-types';

const debug = Debug('cypress-allure:server');
const logMessage = Debug('cypress-allure:server:message');

const log = (...args: unknown[]) => {
  debug(`${args}`);
};

// for testing
export const testMessages: any[] = [];

const messageGot = (...args: unknown[]) => {
  logMessage(`${args}`);
};

const checkPortSync = (port: number, timeoutMs = 2000): boolean => {
  let isAvailable = true;
  let server: net.Server | null = null;
  let timeoutReached = false;
  const startTime = Date.now();

  try {
    server = net.createServer();
    server.listen(port);

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        isAvailable = false;
      }
    });

    const checkTimeout = () => {
      if (Date.now() - startTime >= timeoutMs) {
        timeoutReached = true;
      }
    };

    const waitForListening = () => {
      if (!server?.listening && !timeoutReached) {
        process.nextTick(waitForListening); // Yield to event loop
        checkTimeout(); // Check if timeout has been reached
      }
    };

    waitForListening();

    if (timeoutReached) {
      throw new Error(`Timeout waiting for port ${port} to become available.`);
    }
  } catch (error) {
    isAvailable = false;
  } finally {
    if (server) {
      server.close();
    }
  }

  return isAvailable;
};

function retrieveRandomPortNumber(): number {
  const getRandomPort = () => 40000 + Math.round(Math.random() * 25000);
  let port = getRandomPort();

  for (let i = 0; i < 30; i++) {
    const result = checkPortSync(port);

    if (result) {
      return port;
    }
    port = getRandomPort();
  }

  logWithPackage('error', 'could not find free port, will not report');

  return port;
}

const debugQueue = Debug('cypress-allure:server:queue');

// Verbose logging that can be enabled via ALLURE_DEBUG_QUEUE env var
const isVerboseQueue = () => process.env.ALLURE_DEBUG_QUEUE === 'true';

const logQueue = (...args: unknown[]) => {
  debugQueue(`${args}`);

  if (isVerboseQueue()) {
    logWithPackage('log', `[queue] ${args}`);
  }
};

// Default timeout for queue completion after run ends (5 minutes)
const DEFAULT_QUEUE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Get queue timeout from env variable ALLURE_QUEUE_TIMEOUT_MS (in milliseconds)
 * or ALLURE_QUEUE_TIMEOUT (in seconds) or use default (5 minutes)
 */
const getQueueTimeoutMs = (): number => {
  // Check for milliseconds env var first
  const timeoutMs = process.env.ALLURE_QUEUE_TIMEOUT_MS;

  if (timeoutMs) {
    const parsed = parseInt(timeoutMs, 10);

    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Check for seconds env var
  const timeoutSec = process.env.ALLURE_QUEUE_TIMEOUT;

  if (timeoutSec) {
    const parsed = parseInt(timeoutSec, 10);

    if (!isNaN(parsed) && parsed > 0) {
      return parsed * 1000;
    }
  }

  return DEFAULT_QUEUE_TIMEOUT_MS;
};

/**
 * Message queue to ensure messages are processed in order
 */
class MessageProcessingQueue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: Array<{ data: RawData; resolve: () => void }> = [];
  private isProcessing = false;
  private tasks: AllureTasks;
  private sockserver: WebSocketServer;
  private runEnded = false;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(tasks: AllureTasks, sockserver: WebSocketServer) {
    this.tasks = tasks;
    this.sockserver = sockserver;
  }

  enqueue(data: RawData): Promise<void> {
    return new Promise(resolve => {
      this.queue.push({ data, resolve });
      logQueue(`Enqueued message, queue size: ${this.queue.length}`);
      this.processNext();
    });
  }

  /**
   * Called when the run ends (client disconnects or run end event)
   * Starts a timeout to force completion if tasks don't finish in time
   */
  onRunEnded(): void {
    if (this.runEnded) {
      return;
    }

    this.runEnded = true;
    const timeoutMs = getQueueTimeoutMs();
    logQueue(`Run ended, starting ${timeoutMs / 1000}s timeout for remaining tasks`);

    if (this.queue.length === 0 && !this.isProcessing) {
      logQueue('No pending tasks, queue completed');

      return;
    }

    logQueue(`Pending tasks: ${this.queue.length}, processing: ${this.isProcessing}`);

    this.timeoutId = setTimeout(() => {
      if (this.queue.length > 0 || this.isProcessing) {
        logWithPackage(
          'warn',
          `Queue timeout reached after ${timeoutMs / 1000}s. ` +
            `Forcing completion with ${this.queue.length} pending tasks. ` +
            'Some allure results may be incomplete.',
        );
        this.forceComplete();
      }
    }, timeoutMs);
  }

  /**
   * Force complete all pending tasks without processing
   */
  private forceComplete(): void {
    logQueue(`Force completing ${this.queue.length} pending tasks`);

    // Resolve all pending promises
    while (this.queue.length > 0) {
      const item = this.queue.shift();

      if (item) {
        item.resolve();
      }
    }
    this.isProcessing = false;
    this.clearTimeout();
  }

  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();

    if (!item) {
      this.isProcessing = false;

      return;
    }

    logQueue(`Processing message, remaining in queue: ${this.queue.length}`);

    try {
      await this.processMessage(item.data);
      logQueue('Message processed successfully');
    } finally {
      item.resolve();
      this.isProcessing = false;

      // Check if we're done after run ended
      if (this.runEnded && this.queue.length === 0) {
        logQueue('All tasks completed after run ended');
        this.clearTimeout();
      }

      // Process next item in queue using setImmediate to avoid stack overflow
      // and ensure proper event loop behavior
      if (this.queue.length > 0) {
        logQueue('Scheduling next message processing');
        setImmediate(() => this.processNext());
      }
    }
  }

  private async processMessage(data: RawData): Promise<void> {
    messageGot('message received');
    messageGot(data);

    testMessages.push(`${data}`);

    const parseData = (rawData: RawData) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return JSON.parse(rawData.toString()) as any;
      } catch (e) {
        return {};
      }
    };
    const requestData = parseData(data);
    const payload = requestData.data;

    logQueue(
      `Task: ${payload?.task}, arg: ${JSON.stringify(payload?.arg?.title || payload?.arg?.name || payload?.arg?.message || '')}`,
    );

    if (requestData.id) {
      const result = await executeTask(this.tasks, payload);

      this.sockserver.clients.forEach(client => {
        log(`sending back: ${JSON.stringify(requestData)}`);
        client.send(JSON.stringify({ payload, status: result ? 'done' : 'failed' }));
      });
    } else {
      await executeTask(this.tasks, payload);
      this.sockserver.clients.forEach(client => {
        log(`sending back: ${JSON.stringify(requestData)}`);
        client.send(JSON.stringify({ payload, status: 'done' }));
      });
    }
  }
}

const socketLogic = (sockserver: WebSocketServer | undefined, tasks: AllureTasks) => {
  if (!sockserver) {
    log('Could not start reporting server');

    return;
  }

  sockserver.on('connection', ws => {
    log('New client connected!');
    ws.send('connection established');

    const messageQueue = new MessageProcessingQueue(tasks, sockserver);

    ws.on('close', () => {
      log('Client has disconnected!');
      // Start timeout for remaining tasks when client disconnects
      messageQueue.onRunEnded();
    });

    ws.on('message', data => {
      // Enqueue message for sequential processing
      messageQueue.enqueue(data);
    });

    ws.onerror = function () {
      logWithPackage('error', 'websocket error');
    };
  });
};

export const startReporterServer = (configOptions: PluginConfigOptions, tasks: AllureTasks, attempt = 0) => {
  const wsPort = retrieveRandomPortNumber();

  let sockserver: WebSocketServer | undefined = new WebSocketServer({ port: wsPort, path: wsPath }, () => {
    configOptions.env[ENV_WS] = wsPort;
    const attemptMessage = attempt > 0 ? ` from ${attempt} attempt` : '';
    logWithPackage('log', `running on ${wsPort} port${attemptMessage}`);
    socketLogic(sockserver, tasks);
  });

  sockserver.on('error', err => {
    if (err.message.indexOf('address already in use') !== -1) {
      if (attempt < 30) {
        process.nextTick(() => {
          sockserver = startReporterServer(configOptions, tasks, attempt + 1);
        });
      } else {
        logWithPackage('error', `Could not find free port, will not report: ${err.message}`);
      }

      return;
    }

    logWithPackage('error', `Error on ws server: ${(err as Error).message}`);
  });

  return sockserver;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const executeTask = async (tasks: AllureTasks, data: { task?: any; arg?: any }): Promise<boolean> => {
  if (!data || !data.task) {
    log(`Will not run task - not data or task field:${JSON.stringify(data)}`);

    return false;
  }

  try {
    if (Object.keys(tasks).indexOf(data.task) !== -1) {
      const task = data.task as RequestTask; // todo check
      log(task);
      await tasks[task](data.arg);

      return true;
    } else {
      log(`No such task: ${data.task}`);
    }
  } catch (err) {
    logWithPackage('error', `Error running task: '${data.task}': ${(err as Error).message}`);

    // eslint-disable-next-line no-console
    console.log((err as Error).stack);
  }

  return false;
};
