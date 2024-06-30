import {
  ARGS_TRIM_AT,
  CommandLog,
  commandParams,
  CommandT,
  filterCommandLog,
  ignoreAllCommands,
  isGherkin,
  stepMessage,
} from '@src/common/command-names';

describe('Command names unit tests', () => {
  describe('isGherkin', () => {
    its()
      .each<{ name: string | undefined; expected: boolean }>([
        { name: 'When', expected: true },
        { name: 'Given', expected: true },
        { name: 'Then', expected: true },
        { name: 'And', expected: true },
        { name: 'After', expected: true },
        { name: 'Before', expected: true },
        { name: 'here goes When', expected: false },
        { name: 'here goes Given', expected: false },
        { name: 'here goes Then', expected: false },
        { name: 'here goes And', expected: false },
        { name: 'here goes After', expected: false },
        { name: 'here goes Before', expected: false },
        { name: 'when he comes', expected: false },
        { name: 'given he comes', expected: false },
        { name: 'then he comes', expected: false },
        { name: 'and he comes', expected: false },
        { name: 'after he comes', expected: false },
        { name: 'before he comes', expected: false },
        { name: undefined, expected: false },
      ])
      .run(t => {
        expect(isGherkin(t.name as any)).toEqual(t.expected);
      });
  });

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
      }>([
        {
          command: { attributes: { name: 'cmd name', args: [] } },
          expected: 'cmd name',
        },
        {
          command: {
            attributes: {
              name: 'cmd name',
              args: ['null'],
            },
          },
          expected: 'cmd name',
        },
        {
          command: { attributes: { name: 'cmd name', args: [{ obj: 1 }] } },
          expected: 'cmd name: { obj: 1 }',
        },
        {
          command: { attributes: { name: 'cmd name', args: ['hello', 'buy'] } },
          expected: 'cmd name: hello, buy',
        },
        {
          command: { attributes: { name: 'cmd name', args: ['hello', 1] } },
          expected: 'cmd name: hello, 1',
        },
        {
          command: {
            attributes: { name: 'cmd name', args: ['hello', ['a', 'b', 'c']] },
          },
          expected: 'cmd name: hello, [a,b,c]',
        },
        {
          command: {
            attributes: {
              name: 'cmd name',
              args: ['hello', [{ obj: 'a' }, 'b', 'c']],
            },
          },
          expected: 'cmd name: hello, [{ obj: a },b,c]',
        },
        {
          command: {
            attributes: { name: 'cmd name', args: ['{"obj":1}'] },
          },
          expected: 'cmd name: { obj: 1 }',
        },
      ])
      .run(t => {
        const cmdMessage = commandParams(t.command).message;
        expect(cmdMessage).toEqual(t.expected);
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
                { attributes: { name: 'wrap', message: '{ status: 200 }' } },
              ],
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
