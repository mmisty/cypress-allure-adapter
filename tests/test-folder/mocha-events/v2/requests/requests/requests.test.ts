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

describe('requests', () => {
  let results: PreparedResults;
  outputDebugGenerate(__dirname);

  beforeAll(async () => {
    results = await prepareResults(__dirname, {
      env: { allureAddVideoOnPass: 'false' },
    });
  });

  const normalizePort = (str: string) => str?.replace(/\d+/g, 'number');

  const getRequestSteps = (test: AllureTest | undefined) => {
    return mapSteps(
      test?.steps ?? [],
      t => ({
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

  describe('01 super simple GET without data', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '01 super simple GET');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('should have request step with correct parameters', () => {
      const steps = getRequestSteps(test);

      expect(steps).toEqual([
        {
          name: 'request: http://localhost:number',
          params: [
            { name: 'Response Status', value: '200' },
            { name: 'Request URL', value: 'http://localhost:number/' },
            { name: 'Request Body', value: '' },
            { name: 'Response Body', value: 'Hello World!' },
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
      ]);
    });

    it('attachment file should exist and have content', () => {
      const requestStep = test?.steps?.find(s => s.name?.startsWith('request'));
      const attachment = requestStep?.attachments?.[0];
      expect(attachment).toBeDefined();

      const filePath = `${results.watchDir}/${attachment?.source}`;
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath).toString().length).toBeGreaterThan(0);
    });
  });

  describe('01.2 simple GET without data', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '01.2 simple GET');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('should have request step with GET method in name', () => {
      const steps = getRequestSteps(test);

      expect(steps).toEqual([
        {
          name: 'request: GET, http://localhost:number',
          params: [
            { name: 'Response Status', value: '200' },
            { name: 'Request URL', value: 'http://localhost:number/' },
            { name: 'Request Body', value: '' },
            { name: 'Response Body', value: 'Hello World!' },
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
      ]);
    });
  });

  describe('02 simple POST with data', () => {
    let test: AllureTest | undefined;

    beforeEach(() => {
      test = getTest(results.watchResults, '02 simple POST with data');
    });

    it('test should be defined', () => {
      expect(test).toBeDefined();
    });

    it('should have request step with POST data', () => {
      const steps = getRequestSteps(test);

      expect(steps).toEqual([
        {
          name: 'request: POST, http://localhost:number/hello, {data: "should"}',
          params: [
            { name: 'Response Status', value: '200' },
            { name: 'Request URL', value: 'http://localhost:number/hello' },
            { name: 'Request Body', value: '{\n "data": "should"\n}' },
            { name: 'Response Body', value: '{\n "result": "hello world"\n}' },
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
      ]);
    });
  });
});
