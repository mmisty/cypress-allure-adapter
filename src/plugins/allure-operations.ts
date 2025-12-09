/**
 * Serializable operation types for the Allure Task Server
 *
 * All operations must be serializable (no closures, no functions)
 * so they can be sent over HTTP to a separate process.
 */

/**
 * Base filesystem operations
 */
export type FsOperation =
  | { type: 'fs:mkdir'; path: string; options?: { recursive?: boolean } }
  | { type: 'fs:writeFile'; path: string; content: string; encoding?: BufferEncoding }
  | { type: 'fs:appendFile'; path: string; content: string }
  | { type: 'fs:readFile'; path: string }
  | { type: 'fs:copyFile'; from: string; to: string; removeSource?: boolean }
  | { type: 'fs:removeFile'; path: string }
  | { type: 'fs:exists'; path: string }
  | { type: 'fs:mkdirSync'; path: string; options?: { recursive?: boolean } }
  | { type: 'fs:removeFileSync'; path: string }
  | { type: 'fs:existsSync'; path: string };

/**
 * High-level Allure operations
 */
export type AllureOperation =
  | {
      type: 'allure:attachVideo';
      allureResults: string;
      videoPath: string;
      allureAddVideoOnPass: boolean;
    }
  | {
      type: 'allure:moveToWatch';
      allureResults: string;
      allureResultsWatch: string;
    }
  | {
      type: 'allure:attachScreenshots';
      allureResults: string;
      screenshots: Array<{
        testId: string | undefined;
        path: string;
        testAttemptIndex?: number;
        specName?: string;
        testFailure?: boolean;
      }>;
      allTests: Array<{
        specRelative: string | undefined;
        fullTitle: string;
        uuid: string;
        mochaId: string;
        retryIndex: number | undefined;
        status?: string;
      }>;
    }
  | {
      type: 'allure:copyScreenshot';
      allureResults: string;
      screenshotPath: string;
      targetName: string;
    }
  | {
      type: 'allure:writeTestMessage';
      path: string;
      message: string;
    };

/**
 * Batch operation for efficiency
 */
export type BatchOperation = {
  type: 'batch';
  operations: ServerOperation[];
};

/**
 * Server control operations
 */
export type ControlOperation = { type: 'shutdown' } | { type: 'health' };

/**
 * All server operations
 */
export type ServerOperation = FsOperation | AllureOperation | BatchOperation | ControlOperation;

/**
 * Result of an operation
 */
export type OperationResult = { success: true; data?: unknown } | { success: false; error: string };

/**
 * Server endpoints
 */
export const SERVER_PATH = '/__allure_tasks/';
export const SERVER_HEALTH_PATH = '/__allure_health/';
export const SERVER_PORT_ENV = 'ALLURE_TASK_SERVER_PORT';
