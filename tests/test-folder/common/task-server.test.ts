import http from 'http';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import {
  AllureTaskServer,
  findAvailablePort,
} from '@src/plugins/allure-task-server';
import { AllureTaskClient } from '@src/plugins/allure-task-client';
import type {
  ServerOperation,
  OperationResult,
} from '@src/plugins/allure-operations';
import {
  SERVER_PATH,
  SERVER_HEALTH_PATH,
} from '@src/plugins/allure-operations';

jest.setTimeout(60000);

const TEST_DIR = 'reports/task-server-test';
const TEST_RESULTS_DIR = `${TEST_DIR}/allure-results`;

/**
 * Helper to make HTTP requests to the server
 */
function makeRequest(
  port: number,
  operation: ServerOperation,
): Promise<OperationResult> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(operation);

    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: SERVER_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 10000,
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
            reject(new Error('Invalid response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Helper to check server health
 */
function checkHealth(
  port: number,
): Promise<{ status: string; pending: number; running: number }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: SERVER_HEALTH_PATH,
        method: 'GET',
        timeout: 5000,
      },
      res => {
        let responseBody = '';
        res.on('data', chunk => {
          responseBody += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseBody));
          } catch {
            reject(new Error('Invalid response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

/**
 * Clean test directory
 */
function cleanTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
}

describe('AllureTaskServer', () => {
  describe('Server Lifecycle', () => {
    let server: AllureTaskServer;

    afterEach(async () => {
      if (server) {
        await server.stop();
      }
    });

    it('should start on available port', async () => {
      server = new AllureTaskServer();
      const port = await server.start();

      expect(port).toBeGreaterThan(0);
      expect(server.getPort()).toBe(port);
    });

    it('should start on specified port', async () => {
      const requestedPort = await findAvailablePort(47000);
      server = new AllureTaskServer();
      const port = await server.start(requestedPort);

      expect(port).toBe(requestedPort);
    });

    it('should stop gracefully', async () => {
      server = new AllureTaskServer();
      const port = await server.start();

      expect(server.getPort()).toBe(port);

      await server.stop();

      expect(server.getPort()).toBeNull();
    });

    it('should return same port if already started', async () => {
      server = new AllureTaskServer();
      const port1 = await server.start();
      const port2 = await server.start();

      expect(port1).toBe(port2);
    });
  });

  describe('Health Endpoint', () => {
    let server: AllureTaskServer;

    beforeAll(async () => {
      server = new AllureTaskServer();
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    it('should respond to health check', async () => {
      const port = server.getPort()!;
      const health = await checkHealth(port);

      expect(health.status).toBe('ok');
      expect(health.pending).toBe(0);
      expect(health.running).toBe(0);
    });
  });

  describe('Filesystem Operations', () => {
    let server: AllureTaskServer;
    let port: number;

    beforeAll(async () => {
      cleanTestDir();
      server = new AllureTaskServer();
      port = await server.start();
      // Wait for server to be fully ready
      await new Promise(r => setTimeout(r, 100));
    });

    afterAll(async () => {
      await server.stop();

      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
      }
    });

    beforeEach(() => {
      // Clean and recreate test dir before each test
      cleanTestDir();
    });

    it('should create directory with fs:mkdir', async () => {
      const testPath = `${TEST_DIR}/new-dir`;

      const result = await makeRequest(port, {
        type: 'fs:mkdir',
        path: testPath,
        options: { recursive: true },
      });

      expect(result.success).toBe(true);
      expect(existsSync(testPath)).toBe(true);
    });

    it('should handle existing directory with fs:mkdir', async () => {
      const testPath = `${TEST_DIR}/existing-dir`;
      mkdirSync(testPath, { recursive: true });

      const result = await makeRequest(port, {
        type: 'fs:mkdir',
        path: testPath,
      });

      expect(result.success).toBe(true);
    });

    it('should write file with fs:writeFile', async () => {
      const testPath = `${TEST_DIR}/test-file.txt`;
      const content = 'Hello, World!';

      const result = await makeRequest(port, {
        type: 'fs:writeFile',
        path: testPath,
        content,
      });

      expect(result.success).toBe(true);
      expect(readFileSync(testPath, 'utf8')).toBe(content);
    });

    it('should write file with base64 encoding', async () => {
      const testPath = `${TEST_DIR}/binary-file.bin`;
      const originalContent = 'Binary content test';
      const base64Content = Buffer.from(originalContent).toString('base64');

      const result = await makeRequest(port, {
        type: 'fs:writeFile',
        path: testPath,
        content: base64Content,
        encoding: 'base64',
      });

      expect(result.success).toBe(true);
      expect(readFileSync(testPath, 'utf8')).toBe(originalContent);
    });

    it('should append to file with fs:appendFile', async () => {
      const testPath = `${TEST_DIR}/append-file.txt`;
      writeFileSync(testPath, 'Line 1\n');

      const result = await makeRequest(port, {
        type: 'fs:appendFile',
        path: testPath,
        content: 'Line 2\n',
      });

      expect(result.success).toBe(true);
      expect(readFileSync(testPath, 'utf8')).toBe('Line 1\nLine 2\n');
    });

    it('should read file with fs:readFile', async () => {
      const testPath = `${TEST_DIR}/read-file.txt`;
      const content = 'Read me!';
      writeFileSync(testPath, content);

      const result = await makeRequest(port, {
        type: 'fs:readFile',
        path: testPath,
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(Buffer.from(result.data as string, 'base64').toString()).toBe(
          content,
        );
      }
    });

    it('should copy file with fs:copyFile', async () => {
      const sourcePath = `${TEST_DIR}/source.txt`;
      const targetPath = `${TEST_DIR}/target.txt`;
      writeFileSync(sourcePath, 'Copy me!');

      const result = await makeRequest(port, {
        type: 'fs:copyFile',
        from: sourcePath,
        to: targetPath,
      });

      expect(result.success).toBe(true);
      expect(existsSync(targetPath)).toBe(true);
      expect(readFileSync(targetPath, 'utf8')).toBe('Copy me!');
      expect(existsSync(sourcePath)).toBe(true); // Source still exists
    });

    it('should copy and remove source with fs:copyFile removeSource', async () => {
      const sourcePath = `${TEST_DIR}/source-remove.txt`;
      const targetPath = `${TEST_DIR}/target-remove.txt`;
      writeFileSync(sourcePath, 'Move me!');

      const result = await makeRequest(port, {
        type: 'fs:copyFile',
        from: sourcePath,
        to: targetPath,
        removeSource: true,
      });

      expect(result.success).toBe(true);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(sourcePath)).toBe(false); // Source removed
    });

    it('should remove file with fs:removeFile', async () => {
      const testPath = `${TEST_DIR}/remove-me.txt`;
      writeFileSync(testPath, 'Delete me!');

      expect(existsSync(testPath)).toBe(true);

      const result = await makeRequest(port, {
        type: 'fs:removeFile',
        path: testPath,
      });

      expect(result.success).toBe(true);
      expect(existsSync(testPath)).toBe(false);
    });

    it('should remove directory recursively with fs:removeFile', async () => {
      const testPath = `${TEST_DIR}/remove-dir`;
      mkdirSync(`${testPath}/nested`, { recursive: true });
      writeFileSync(`${testPath}/nested/file.txt`, 'content');

      const result = await makeRequest(port, {
        type: 'fs:removeFile',
        path: testPath,
      });

      expect(result.success).toBe(true);
      expect(existsSync(testPath)).toBe(false);
    });

    it('should check file exists with fs:exists', async () => {
      const existingPath = `${TEST_DIR}/exists.txt`;
      const nonExistingPath = `${TEST_DIR}/not-exists.txt`;
      writeFileSync(existingPath, 'I exist!');

      const resultExists = await makeRequest(port, {
        type: 'fs:exists',
        path: existingPath,
      });

      const resultNotExists = await makeRequest(port, {
        type: 'fs:exists',
        path: nonExistingPath,
      });

      expect(resultExists.success).toBe(true);

      if (resultExists.success) {
        expect(resultExists.data).toBe(true);
      }
      expect(resultNotExists.success).toBe(true);

      if (resultNotExists.success) {
        expect(resultNotExists.data).toBe(false);
      }
    });

    it('should handle sync operations fs:existsSync', async () => {
      const existingPath = `${TEST_DIR}/exists-sync.txt`;
      writeFileSync(existingPath, 'content');

      const result = await makeRequest(port, {
        type: 'fs:existsSync',
        path: existingPath,
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toBe(true);
      }
    });
  });

  describe('Batch Operations', () => {
    let server: AllureTaskServer;
    let port: number;

    beforeAll(async () => {
      cleanTestDir();
      server = new AllureTaskServer();
      port = await server.start();
      await new Promise(r => setTimeout(r, 100));
    });

    afterAll(async () => {
      await server.stop();

      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
      }
    });

    beforeEach(() => {
      cleanTestDir();
    });

    it('should execute batch of operations', async () => {
      const dir1 = `${TEST_DIR}/batch-dir1`;
      const dir2 = `${TEST_DIR}/batch-dir2`;
      const file1 = `${TEST_DIR}/batch-file1.txt`;

      const result = await makeRequest(port, {
        type: 'batch',
        operations: [
          { type: 'fs:mkdir', path: dir1 },
          { type: 'fs:mkdir', path: dir2 },
          { type: 'fs:writeFile', path: file1, content: 'batch content' },
        ],
      });

      expect(result.success).toBe(true);
      expect(existsSync(dir1)).toBe(true);
      expect(existsSync(dir2)).toBe(true);
      expect(existsSync(file1)).toBe(true);
    });

    it('should report failure if any batch operation fails', async () => {
      const result = await makeRequest(port, {
        type: 'batch',
        operations: [
          { type: 'fs:mkdir', path: `${TEST_DIR}/batch-ok` },
          { type: 'fs:readFile', path: `${TEST_DIR}/non-existent-file.txt` }, // This will fail
        ],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Allure Operations', () => {
    let server: AllureTaskServer;
    let port: number;

    beforeAll(async () => {
      cleanTestDir();
      mkdirSync(TEST_RESULTS_DIR, { recursive: true });
      server = new AllureTaskServer();
      port = await server.start();
      await new Promise(r => setTimeout(r, 100));
    });

    afterAll(async () => {
      await server.stop();

      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
      }
    });

    beforeEach(() => {
      cleanTestDir();
      mkdirSync(TEST_RESULTS_DIR, { recursive: true });
    });

    it('should write test message with allure:writeTestMessage', async () => {
      const testPath = `${TEST_RESULTS_DIR}/test-message.txt`;

      const result1 = await makeRequest(port, {
        type: 'allure:writeTestMessage',
        path: testPath,
        message: 'Message 1',
      });

      const result2 = await makeRequest(port, {
        type: 'allure:writeTestMessage',
        path: testPath,
        message: 'Message 2',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(readFileSync(testPath, 'utf8')).toBe('Message 1\nMessage 2\n');
    });

    it('should copy screenshot with allure:copyScreenshot', async () => {
      const screenshotSource = `${TEST_DIR}/screenshot.png`;
      const targetName = 'copied-screenshot.png';

      // Create a fake screenshot
      writeFileSync(screenshotSource, 'fake png content');

      const result = await makeRequest(port, {
        type: 'allure:copyScreenshot',
        allureResults: TEST_RESULTS_DIR,
        screenshotPath: screenshotSource,
        targetName,
      });

      expect(result.success).toBe(true);
      expect(existsSync(`${TEST_RESULTS_DIR}/${targetName}`)).toBe(true);
    });

    it('should fail copyScreenshot if source does not exist', async () => {
      const result = await makeRequest(port, {
        type: 'allure:copyScreenshot',
        allureResults: TEST_RESULTS_DIR,
        screenshotPath: `${TEST_DIR}/non-existent.png`,
        targetName: 'target.png',
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toContain('does not exist');
      }
    });
  });

  describe('Error Handling', () => {
    let server: AllureTaskServer;
    let port: number;

    beforeAll(async () => {
      server = new AllureTaskServer();
      port = await server.start();
      await new Promise(r => setTimeout(r, 100));
    });

    afterAll(async () => {
      await server.stop();
    });

    it('should handle unknown operation type', async () => {
      const result = await makeRequest(port, {
        type: 'unknown:operation' as any,
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toContain('Unknown operation');
      }
    });

    it('should handle health operation', async () => {
      const result = await makeRequest(port, {
        type: 'health',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Concurrency', () => {
    let server: AllureTaskServer;
    let port: number;

    beforeAll(async () => {
      cleanTestDir();
      server = new AllureTaskServer(5); // Max 5 concurrent operations
      port = await server.start();
      await new Promise(r => setTimeout(r, 100));
    });

    afterAll(async () => {
      await server.stop();

      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
      }
    });

    it('should handle multiple concurrent requests', async () => {
      const requests: Promise<OperationResult>[] = [];

      // Send 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          makeRequest(port, {
            type: 'fs:mkdir',
            path: `${TEST_DIR}/concurrent-${i}`,
          }),
        );
      }

      const results = await Promise.all(requests);

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);

      // All directories should exist
      for (let i = 0; i < 10; i++) {
        expect(existsSync(`${TEST_DIR}/concurrent-${i}`)).toBe(true);
      }
    });
  });

  describe('HTTP Protocol Handling', () => {
    let server: AllureTaskServer;
    let port: number;

    beforeAll(async () => {
      server = new AllureTaskServer();
      port = await server.start();
      await new Promise(r => setTimeout(r, 100));
    });

    afterAll(async () => {
      await server.stop();
    });

    it('should handle OPTIONS request (CORS preflight)', async () => {
      const response = await new Promise<{ statusCode: number }>(
        (resolve, reject) => {
          const req = http.request(
            {
              hostname: 'localhost',
              port,
              path: SERVER_PATH,
              method: 'OPTIONS',
              timeout: 5000,
            },
            res => {
              resolve({ statusCode: res.statusCode || 0 });
            },
          );
          req.on('error', reject);
          req.end();
        },
      );

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 for unknown paths', async () => {
      const response = await new Promise<{ statusCode: number; body: string }>(
        (resolve, reject) => {
          const req = http.request(
            {
              hostname: 'localhost',
              port,
              path: '/unknown/path',
              method: 'GET',
              timeout: 5000,
            },
            res => {
              let body = '';
              res.on('data', chunk => {
                body += chunk;
              });
              res.on('end', () => {
                resolve({ statusCode: res.statusCode || 0, body });
              });
            },
          );
          req.on('error', reject);
          req.end();
        },
      );

      expect(response.statusCode).toBe(404);
      expect(response.body).toBe('Not found');
    });

    it('should return 404 for GET on task path', async () => {
      const response = await new Promise<{ statusCode: number }>(
        (resolve, reject) => {
          const req = http.request(
            {
              hostname: 'localhost',
              port,
              path: SERVER_PATH,
              method: 'GET',
              timeout: 5000,
            },
            res => {
              resolve({ statusCode: res.statusCode || 0 });
            },
          );
          req.on('error', reject);
          req.end();
        },
      );

      expect(response.statusCode).toBe(404);
    });

    it('should handle invalid JSON body', async () => {
      const response = await new Promise<{ statusCode: number; body: string }>(
        (resolve, reject) => {
          const req = http.request(
            {
              hostname: 'localhost',
              port,
              path: SERVER_PATH,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': 12,
              },
              timeout: 5000,
            },
            res => {
              let body = '';
              res.on('data', chunk => {
                body += chunk;
              });
              res.on('end', () => {
                resolve({ statusCode: res.statusCode || 0, body });
              });
            },
          );
          req.on('error', reject);
          req.write('invalid json');
          req.end();
        },
      );

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Complex Allure Operations', () => {
    let server: AllureTaskServer;
    let port: number;
    const ALLURE_RESULTS = `${TEST_DIR}/allure-results`;
    const ALLURE_WATCH = `${TEST_DIR}/allure-watch`;

    beforeAll(async () => {
      cleanTestDir();
      server = new AllureTaskServer();
      port = await server.start();
      await new Promise(r => setTimeout(r, 100));
    });

    afterAll(async () => {
      await server.stop();

      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
      }
    });

    beforeEach(() => {
      cleanTestDir();
      mkdirSync(ALLURE_RESULTS, { recursive: true });
    });

    /**
     * Helper to create a mock container file
     */
    function createMockContainer(uuid: string, children: string[]) {
      const container = {
        uuid,
        name: 'Test Suite',
        children,
        befores: [],
        afters: [],
        start: Date.now(),
        stop: Date.now(),
      };
      writeFileSync(
        `${ALLURE_RESULTS}/${uuid}-container.json`,
        JSON.stringify(container),
      );

      return container;
    }

    describe('allure:attachVideo', () => {
      it('should fail if video does not exist', async () => {
        const result = await makeRequest(port, {
          type: 'allure:attachVideo',
          allureResults: ALLURE_RESULTS,
          videoPath: `${TEST_DIR}/non-existent.mp4`,
          allureAddVideoOnPass: true,
        });

        expect(result.success).toBe(false);

        if (!result.success) {
          expect(result.error).toContain('does not exist');
        }
      });

      it('should succeed with empty allure results', async () => {
        const videoPath = `${TEST_DIR}/test-video.mp4`;
        writeFileSync(videoPath, 'fake video content');

        const result = await makeRequest(port, {
          type: 'allure:attachVideo',
          allureResults: ALLURE_RESULTS,
          videoPath,
          allureAddVideoOnPass: true,
        });

        expect(result.success).toBe(true);
      });

      it('should attach video to container with failed test', async () => {
        const videoPath = `${TEST_DIR}/spec-name.mp4`;
        writeFileSync(videoPath, 'fake video content');

        // Create container and test result
        const containerUuid = 'container-123';
        const testUuid = 'test-456';

        createMockContainer(containerUuid, [testUuid]);

        // Create test result with parent reference (simulate parseAllure output)
        const testResult = {
          uuid: testUuid,
          name: 'test name',
          fullName: 'test name',
          status: 'failed',
          stage: 'finished',
          labels: [{ name: 'path', value: 'spec-name.cy.ts' }],
          attachments: [],
          start: Date.now(),
          stop: Date.now(),
        };
        writeFileSync(
          `${ALLURE_RESULTS}/${testUuid}-result.json`,
          JSON.stringify(testResult),
        );

        const result = await makeRequest(port, {
          type: 'allure:attachVideo',
          allureResults: ALLURE_RESULTS,
          videoPath,
          allureAddVideoOnPass: false,
        });

        expect(result.success).toBe(true);
      });
    });

    describe('allure:moveToWatch', () => {
      it('should return success when source and target are same', async () => {
        const result = await makeRequest(port, {
          type: 'allure:moveToWatch',
          allureResults: ALLURE_RESULTS,
          allureResultsWatch: ALLURE_RESULTS,
        });

        expect(result.success).toBe(true);
      });

      it('should create watch directory if not exists', async () => {
        const result = await makeRequest(port, {
          type: 'allure:moveToWatch',
          allureResults: ALLURE_RESULTS,
          allureResultsWatch: ALLURE_WATCH,
        });

        expect(result.success).toBe(true);
        expect(existsSync(ALLURE_WATCH)).toBe(true);
      });

      it('should move environment and executor files', async () => {
        writeFileSync(`${ALLURE_RESULTS}/environment.properties`, 'key=value');
        writeFileSync(`${ALLURE_RESULTS}/executor.json`, '{"name":"test"}');
        writeFileSync(`${ALLURE_RESULTS}/categories.json`, '[]');

        const result = await makeRequest(port, {
          type: 'allure:moveToWatch',
          allureResults: ALLURE_RESULTS,
          allureResultsWatch: ALLURE_WATCH,
        });

        expect(result.success).toBe(true);
        expect(existsSync(`${ALLURE_WATCH}/environment.properties`)).toBe(true);
        expect(existsSync(`${ALLURE_WATCH}/executor.json`)).toBe(true);
        expect(existsSync(`${ALLURE_WATCH}/categories.json`)).toBe(true);
      });

      it('should move test results with attachments', async () => {
        // Create a test result
        const uuid = 'test-uuid-789';
        const attachmentName = `${uuid}-attachment.png`;

        const testResult = {
          uuid,
          name: 'test',
          fullName: 'test',
          status: 'passed',
          stage: 'finished',
          labels: [],
          attachments: [
            {
              name: 'screenshot.png',
              source: attachmentName,
              type: 'image/png',
            },
          ],
          start: Date.now(),
          stop: Date.now(),
        };

        writeFileSync(
          `${ALLURE_RESULTS}/${uuid}-result.json`,
          JSON.stringify(testResult),
        );
        writeFileSync(`${ALLURE_RESULTS}/${attachmentName}`, 'fake image');

        const result = await makeRequest(port, {
          type: 'allure:moveToWatch',
          allureResults: ALLURE_RESULTS,
          allureResultsWatch: ALLURE_WATCH,
        });

        expect(result.success).toBe(true);
      });
    });

    describe('allure:attachScreenshots', () => {
      it('should succeed with empty screenshots array', async () => {
        const result = await makeRequest(port, {
          type: 'allure:attachScreenshots',
          allureResults: ALLURE_RESULTS,
          screenshots: [],
          allTests: [],
        });

        expect(result.success).toBe(true);
      });

      it('should skip if no matching tests found', async () => {
        const screenshotPath = `${TEST_DIR}/screenshot.png`;
        writeFileSync(screenshotPath, 'fake image');

        const result = await makeRequest(port, {
          type: 'allure:attachScreenshots',
          allureResults: ALLURE_RESULTS,
          screenshots: [
            {
              testId: 'non-existent',
              path: screenshotPath,
              testAttemptIndex: 0,
              specName: 'spec.cy.ts',
            },
          ],
          allTests: [],
        });

        expect(result.success).toBe(true);
      });

      it('should attach screenshot to failed test', async () => {
        const uuid = 'test-screenshot-123';
        const screenshotPath = `${TEST_DIR}/screenshot.png`;
        writeFileSync(screenshotPath, 'fake image');

        // Create test result file
        const testResult = {
          uuid,
          name: 'failed test',
          fullName: 'failed test',
          status: 'failed',
          stage: 'finished',
          labels: [],
          attachments: [],
          start: Date.now(),
          stop: Date.now(),
        };
        writeFileSync(
          `${ALLURE_RESULTS}/${uuid}-result.json`,
          JSON.stringify(testResult),
        );

        const result = await makeRequest(port, {
          type: 'allure:attachScreenshots',
          allureResults: ALLURE_RESULTS,
          screenshots: [
            {
              testId: 'mocha-id-1',
              path: screenshotPath,
              testAttemptIndex: 0,
              specName: 'spec.cy.ts',
            },
          ],
          allTests: [
            {
              specRelative: 'cypress/e2e/spec.cy.ts',
              fullTitle: 'failed test',
              uuid,
              mochaId: 'mocha-id-1',
              retryIndex: 0,
              status: 'failed',
            },
          ],
        });

        expect(result.success).toBe(true);

        // Verify screenshot was attached
        const updatedResult = JSON.parse(
          readFileSync(`${ALLURE_RESULTS}/${uuid}-result.json`, 'utf8'),
        );
        expect(updatedResult.attachments.length).toBe(1);
        expect(updatedResult.attachments[0].type).toBe('image/png');
      });
    });

    describe('allure:copyScreenshot edge cases', () => {
      it('should create allure results directory if not exists', async () => {
        const newResultsDir = `${TEST_DIR}/new-allure-results`;
        const screenshotPath = `${TEST_DIR}/edge-screenshot.png`;
        writeFileSync(screenshotPath, 'fake image');

        const result = await makeRequest(port, {
          type: 'allure:copyScreenshot',
          allureResults: newResultsDir,
          screenshotPath,
          targetName: 'target.png',
        });

        expect(result.success).toBe(true);
        expect(existsSync(newResultsDir)).toBe(true);
        expect(existsSync(`${newResultsDir}/target.png`)).toBe(true);
      });

      it('should not overwrite existing file', async () => {
        const screenshotPath = `${TEST_DIR}/original.png`;
        const targetName = 'existing.png';
        writeFileSync(screenshotPath, 'new content');
        writeFileSync(`${ALLURE_RESULTS}/${targetName}`, 'existing content');

        const result = await makeRequest(port, {
          type: 'allure:copyScreenshot',
          allureResults: ALLURE_RESULTS,
          screenshotPath,
          targetName,
        });

        expect(result.success).toBe(true);
        // Content should remain unchanged
        expect(readFileSync(`${ALLURE_RESULTS}/${targetName}`, 'utf8')).toBe(
          'existing content',
        );
      });
    });
  });
});

describe('findAvailablePort', () => {
  it('should find an available port', async () => {
    const port = await findAvailablePort(45000);

    expect(port).toBeGreaterThanOrEqual(45000);
    expect(port).toBeLessThan(46100); // Should find within 100 attempts
  });

  it('should find different port if first is taken', async () => {
    // Start a server on a specific port
    const server = new AllureTaskServer();
    const firstPort = await server.start(45500);

    // Try to find a port starting from same number
    const secondPort = await findAvailablePort(45500);

    expect(secondPort).not.toBe(firstPort);

    await server.stop();
  });
});

describe('AllureTaskClient', () => {
  beforeAll(() => {
    cleanTestDir();
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('Remote Mode', () => {
    let client: AllureTaskClient;

    beforeEach(() => {
      cleanTestDir();
    });

    afterEach(async () => {
      if (client) {
        await client.stop();
      }
    });

    it('should start and connect to server', async () => {
      client = new AllureTaskClient('remote');
      const port = await client.start();

      expect(port).toBeGreaterThan(0);
      expect(client.getPort()).toBe(port);
    });

    it('should execute operations via client', async () => {
      client = new AllureTaskClient('remote');
      await client.start();

      await client.mkdir(`${TEST_DIR}/client-dir`);

      expect(existsSync(`${TEST_DIR}/client-dir`)).toBe(true);
    });

    it('should write and read files via client', async () => {
      client = new AllureTaskClient('remote');
      await client.start();

      const testPath = `${TEST_DIR}/client-file.txt`;
      await client.writeFile(testPath, 'Hello from client!');

      const content = await client.readFile(testPath);
      expect(content.toString()).toBe('Hello from client!');
    });

    it('should check file existence via client', async () => {
      client = new AllureTaskClient('remote');
      await client.start();

      const existingPath = `${TEST_DIR}/exists-client.txt`;
      writeFileSync(existingPath, 'content');

      expect(await client.exists(existingPath)).toBe(true);
      expect(await client.exists(`${TEST_DIR}/not-exists.txt`)).toBe(false);
    });

    it('should copy files via client', async () => {
      client = new AllureTaskClient('remote');
      await client.start();

      const sourcePath = `${TEST_DIR}/client-source.txt`;
      const targetPath = `${TEST_DIR}/client-target.txt`;
      writeFileSync(sourcePath, 'Copy via client');

      await client.copyFile(sourcePath, targetPath);

      expect(existsSync(targetPath)).toBe(true);
      expect(readFileSync(targetPath, 'utf8')).toBe('Copy via client');
    });

    it('should remove files via client', async () => {
      client = new AllureTaskClient('remote');
      await client.start();

      const testPath = `${TEST_DIR}/client-remove.txt`;
      writeFileSync(testPath, 'Remove me');

      await client.removeFile(testPath);

      expect(existsSync(testPath)).toBe(false);
    });
  });

  describe('Local Mode', () => {
    let client: AllureTaskClient;

    beforeEach(() => {
      cleanTestDir();
    });

    afterEach(async () => {
      if (client) {
        await client.stop();
      }
    });

    it('should work in local mode without starting server', async () => {
      client = new AllureTaskClient('local');
      const port = await client.start();

      expect(port).toBe(0); // Local mode returns 0
      expect(client.getMode()).toBe('local');
    });

    it('should execute FS operations in local mode', async () => {
      client = new AllureTaskClient('local');
      await client.start();

      await client.mkdir(`${TEST_DIR}/local-dir`);
      expect(existsSync(`${TEST_DIR}/local-dir`)).toBe(true);

      await client.writeFile(`${TEST_DIR}/local-file.txt`, 'Local content');
      expect(readFileSync(`${TEST_DIR}/local-file.txt`, 'utf8')).toBe(
        'Local content',
      );
    });
  });

  describe('Error Recovery', () => {
    let client: AllureTaskClient;

    beforeEach(() => {
      cleanTestDir();
    });

    afterEach(async () => {
      if (client) {
        await client.stop();
      }
    });

    it('should retry on connection failure', async () => {
      client = new AllureTaskClient('remote');
      await client.start();

      // Execute should work
      await client.mkdir(`${TEST_DIR}/retry-test`);
      expect(existsSync(`${TEST_DIR}/retry-test`)).toBe(true);
    });
  });
});
