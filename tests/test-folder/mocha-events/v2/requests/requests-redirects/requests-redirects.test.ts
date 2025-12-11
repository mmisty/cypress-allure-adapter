import { expect } from 'expect';
import {
  getTest,
  mapSteps,
  outputDebugGenerate,
  PreparedResults,
  prepareResults,
} from '../../../../../cy-helper/utils-v2';
import { AllureTest } from 'allure-js-parser';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

describe('requests with redirects', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'false', allureLogCyCommands: 'true' },
    });
  });

  const normalizePort = (str: string) => str?.replace(/\d{4,}/g, 'number');

  const getSteps = (test: AllureTest | undefined) => {
    return mapSteps(
      test?.steps ?? [],
      t => ({
        status: t.status,
        name: normalizePort(t.name!),
        params: t.parameters.map(p => ({
          ...p,
          value: p.name === 'Request URL' ? normalizePort(p.value) : p.value,
        })),
        attachments: t.attachments.map(a => ({
          name: a.name,
          type: a.type,
          source: `source${path.extname(a.source)}`,
        })),
      }),
      t => t.name?.startsWith('request') ?? false,
    );
  };

  describe('01 redirects test', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '01 redirects test');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('should have redirect request steps', () => {
      const steps = getSteps(test);

      expect(steps).toEqual([
        {
          status: 'broken',
          name: 'request: /api/test',
          params: [],
          attachments: [],
          steps: [
            {
              status: 'broken',
              name: 'request: 302 api/test',
              params: [
                {
                  name: 'Request URL',
                  value: 'http://localhost:number/api/test',
                },
                { name: 'Request Body', value: '' },
                { name: 'Response Body', value: '' },
              ],
              attachments: [
                {
                  name: 'requests',
                  type: 'application/json',
                  source: 'source.json',
                },
              ],
              steps: [],
            },
            {
              status: 'passed',
              name: 'request: 200 __/',
              params: [
                { name: 'Request URL', value: 'http://localhost:number/__/' },
                { name: 'Request Body', value: '' },
              ],
              attachments: [
                {
                  name: 'requests',
                  type: 'application/json',
                  source: 'source.json',
                },
              ],
              steps: [],
            },
          ],
        },
      ]);
    });

    it('attachment files should exist', () => {
      const requestStep = test?.steps?.find(s => s.name?.startsWith('request'));
      const nestedSteps = requestStep?.steps ?? [];

      nestedSteps.forEach(step => {
        const attachment = step?.attachments?.[0];

        if (attachment) {
          const filePath = `${results.watchDir}/${attachment.source}`;
          expect(existsSync(filePath)).toBe(true);
          expect(readFileSync(filePath).toString().length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('02 its status', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '02 its status');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('should have wrap and its steps', () => {
      const steps = mapSteps(
        test?.steps ?? [],
        t => ({
          status: t.status,
          name: t.name,
          params: t.parameters,
          attachments: t.attachments,
        }),
        t =>
          t.name?.indexOf('before each') === -1 &&
          t.name?.indexOf('after each') === -1,
      );

      expect(steps).toEqual([
        {
          status: 'passed',
          name: 'wrap: {status: 200}',
          params: [],
          attachments: [],
          steps: [],
        },
        {
          status: 'passed',
          name: 'its: status',
          params: [],
          attachments: [],
          steps: [
            {
              status: 'passed',
              name: 'assert: expected **200** to equal **200**',
              params: [],
              attachments: [],
              steps: [],
            },
          ],
        },
      ]);
    });
  });
});
