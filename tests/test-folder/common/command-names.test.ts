import {
  ARGS_TRIM_AT,
  CommandLog,
  commandParams,
  CommandT,
  filterCommandLog,
  ignoreAllCommands,
  stepMessage,
} from '@src/common/command-names';

describe('Command names unit tests', () => {
  describe('ignoreAllCommands', () => {
    its()
      .each([
        { commands: [], log: 'GGG', expected: false },
        { commands: [], log: 'shouldDo', expected: false },
        { commands: [], log: 'should', expected: true },
        { commands: [], log: 'then', expected: true },
        { commands: [], log: 'allure', expected: true },
        { commands: [], log: 'doSyncCommand', expected: true },
        { commands: ['additional'], log: 'additional', expected: true },
        { commands: ['before*'], log: 'before doing smth', expected: true },
        { commands: ['*before'], log: 'doing smth before', expected: true },
        { commands: ['additional', 'should'], log: 'should', expected: true },
      ])
      .run(t => {
        const isIgnored = ignoreAllCommands(() => t.commands).includes(t.log);
        expect(isIgnored).toEqual(t.expected);
      });
  });

  describe('commandParams', () => {
    its()
      .each<{
        command: CommandT;
        expected: string;
        expectedIsLog: boolean;
      }>([
        {
          command: { attributes: { name: 'cmd name', args: [] } },
          expected: 'cmd name',
          expectedIsLog: true,
        },
        {
          command: {
            attributes: {
              name: 'cmd name',
              args: ['null'],
            },
          },
          expected: 'cmd name',
          expectedIsLog: true,
        },
        {
          command: { attributes: { name: 'cmd name', args: [{ obj: 1 }] } },
          expected: 'cmd name: {obj: 1}',
          expectedIsLog: true,
        },
        {
          command: { attributes: { name: 'cmd name', args: ['hello', 'buy'] } },
          expected: 'cmd name: hello, buy',
          expectedIsLog: true,
        },
        {
          command: { attributes: { name: 'cmd name', args: ['hello', 1] } },
          expected: 'cmd name: hello, 1',
          expectedIsLog: true,
        },
        {
          command: {
            attributes: { name: 'cmd name', args: ['hello', ['a', 'b', 'c']] },
          },
          expected: 'cmd name: hello, [a,b,c]',
          expectedIsLog: true,
        },
        {
          command: {
            attributes: {
              name: 'cmd name',
              args: ['hello', [{ obj: 'a' }, 'b', 'c']],
            },
          },
          expected: 'cmd name: hello, [{obj: "a"},b,c]',
          expectedIsLog: true,
        },
        {
          command: {
            attributes: { name: 'cmd name', args: ['{"obj":1}'] },
          },
          expected: 'cmd name: {obj: 1}',
          expectedIsLog: true,
        },
        {
          command: {
            attributes: {
              name: 'request',
              args: [{ method: 'POST', url: 'http://' }],
            },
          },
          expected: 'request: POST, http://',
          expectedIsLog: true,
        },
        {
          desc: 'args not array',
          command: {
            attributes: {
              name: 'request',
              args: undefined,
            },
          },
          expected: 'request',
          expectedIsLog: false,
        },
        {
          desc: 'no log attribute',
          command: {
            attributes: {
              name: 'myCommand',
              args: [{ a: 1 }, { log: false }],
            },
          },
          expected: 'myCommand: {a: 1}, {log: false}',
          expectedIsLog: false,
        },
        {
          desc: 'no name',
          command: {
            attributes: {
              name: ' ',
              args: ['step message'],
            },
          },
          expected: 'step message',
          expectedIsLog: true,
        },
      ])
      .run(t => {
        const cmdMessage = commandParams(t.command).message;
        const isLog = commandParams(t.command).isLog;
        expect(cmdMessage).toEqual(t.expected);
        expect(isLog).toEqual(t.expectedIsLog);
      });

    describe('stepMessage', () => {
      its()
        .each<{
          name: string;
          message?: string;
          expected: string;
        }>([
          { name: 'wrap', message: '', expected: 'wrap' },
          { name: 'wrap', message: 'null', expected: 'wrap: null' },
          {
            name: 'wrap',
            message: '{status: 200}',
            expected: 'wrap: {status: 200}',
          },
          {
            name: 'assert',
            message: 'expect(10).eq(10)',
            expected: 'assert: expect(10).eq(10)',
          },
          {
            desc: 'long args more than const',
            name: 'log',
            message: '0'.repeat(ARGS_TRIM_AT + 1),
            expected: 'log',
          },

          {
            desc: 'long args less that const and assert',
            name: 'assert',
            message: '0'.repeat(ARGS_TRIM_AT + 1),
            expected: `assert: ${'0'.repeat(ARGS_TRIM_AT + 1)}`,
          },

          {
            desc: 'long args less that const',
            name: 'log',
            message: '0'.repeat(ARGS_TRIM_AT - 1),
            expected: `log: ${'0'.repeat(ARGS_TRIM_AT - 1)}`,
          },
        ])
        .run(t => {
          const cmdMessage = stepMessage(t.name, t.message);
          expect(cmdMessage).toEqual(t.expected);
        });
    });
  });

  describe('filterCommandLog', () => {
    its()
      .each<{
        command: CommandT;
        ignoreCommands: string[];
        expected: CommandLog[];
        only?: boolean;
      }>([
        { command: {}, ignoreCommands: [], expected: [] },
        {
          desc: 'should keep log',
          command: {
            attributes: {
              name: 'cmd name',
              args: [],
              logs: [{ attributes: { name: 'LOG' } }],
            },
          },
          ignoreCommands: [],
          expected: [{ attributes: { name: 'LOG' } }],
        },
        {
          desc: 'should keep log when diff args',
          command: {
            attributes: {
              name: 'cmd name',
              args: ['A'],
              logs: [{ attributes: { name: 'cmd name', message: 'B' } }],
            },
          },
          ignoreCommands: [],
          expected: [{ attributes: { name: 'cmd name', message: 'B' } }],
        },
        {
          desc: 'should ignore log when same messages',
          command: {
            attributes: {
              name: 'wrap',
              args: [],
              logs: [{ attributes: { name: 'wrap', message: '' } }],
            },
          },
          ignoreCommands: [],
          expected: [],
        },
        {
          desc: 'should ignore log when same messages with args',
          command: {
            attributes: {
              name: 'wrap',
              args: [{ status: 200 }],
              logs: [
                { attributes: { name: 'wrap', message: '{status: 200}' } },
              ],
            },
          },
          ignoreCommands: [],
          expected: [],
        },
        {
          desc: 'should ignore request',
          command: {
            attributes: {
              name: 'request',
              args: [{ status: 200 }],
              logs: [{ attributes: { name: 'request', message: 'POST 123' } }],
            },
          },
          ignoreCommands: [],
          expected: [],
        },
        {
          desc: 'should ignore its',
          command: {
            attributes: {
              name: 'its',
              args: ['.status 345'],
              logs: [{ attributes: { name: 'request', message: 'POST 123' } }],
            },
          },
          ignoreCommands: [],
          expected: [],
        },
        {
          desc: 'should ignore its log',
          command: {
            attributes: {
              name: 'its',
              args: ['status'],
              logs: [{ attributes: { name: 'its', message: '.status' } }],
            },
          },
          ignoreCommands: [],
          expected: [],
        },
        {
          desc: 'should ignore same log as cmd without args',
          command: {
            attributes: {
              name: 'task',
              args: ['log'],
              logs: [{ attributes: { name: 'task', message: undefined } }],
            },
          },
          ignoreCommands: [],
          expected: [],
        },
        {
          desc: 'should ignore same log but with quotes',
          command: {
            attributes: {
              name: 'task',
              args: ['log'],
              logs: [{ attributes: { name: 'task', message: '"log"' } }],
            },
          },
          ignoreCommands: [],
          expected: [],
        },
      ])
      //.only(t => (t as any).only)
      .run(t => {
        const filtered = filterCommandLog(t.command, () => t.ignoreCommands);
        expect(filtered).toEqual(t.expected);
      });
  });
});
