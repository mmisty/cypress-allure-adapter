import { wrapHooks } from '@src/plugins/helper';

describe('wrapHooks', () => {
  it('should not wrap when no hooks', () => {
    const steps = [
      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ] as any;
    const res = wrapHooks('"before each" hook', steps);
    expect(res).toEqual([
      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ]);
  });

  it('should not wrap one hook', () => {
    const steps = [
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },

      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ] as any;
    const res = wrapHooks('"before each" hook', steps);
    expect(res).toEqual([
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },

      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ]);
  });

  it('should wrap two or more hooks', () => {
    const steps = [
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },

      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ] as any;
    const res = wrapHooks('"before each" hook', steps);
    expect(res).toEqual([
      {
        attachments: [],
        name: '"before each" hooks',
        parameters: [],
        stage: 'finished',
        status: 'passed',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
          },
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
          },
        ],
      },
      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ]);
  });

  it('should wrap four hooks', () => {
    const steps = [
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },

      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ] as any;
    const res = wrapHooks('"before each" hook', steps);
    expect(res).toEqual([
      {
        attachments: [],
        name: '"before each" hooks',
        parameters: [],
        stage: 'finished',
        status: 'passed',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
          },
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
          },
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
          },
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
          },
        ],
      },
      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ]);
  });

  it('should wrap after each hooks', () => {
    const steps = [
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },

      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"after each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"after each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"after each" hook',
        status: 'passed',
      },
    ] as any;
    const res = wrapHooks('"after each" hook', steps);
    expect(res).toEqual([
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"after each" hooks',
        parameters: [],
        stage: 'finished',
        status: 'passed',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: '"after each" hook',
            status: 'passed',
          },
          {
            attachments: [],
            name: '"after each" hook',
            status: 'passed',
          },
          {
            attachments: [],
            name: '"after each" hook',
            status: 'passed',
          },
        ],
      },
    ]);
  });

  it('should have non-success status of children hook', () => {
    const steps = [
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"before each" hook',
        status: 'failed',
      },
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"before each" hook',
        status: 'broken',
      },

      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ] as any;
    const res = wrapHooks('"before each" hook', steps);
    expect(res).toEqual([
      {
        attachments: [],
        name: '"before each" hooks',
        parameters: [],
        stage: 'finished',
        status: 'failed',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
          },
          {
            attachments: [],
            name: '"before each" hook',
            status: 'failed',
          },
          {
            attachments: [],
            name: '"before each" hook',
            status: 'passed',
          },
          {
            attachments: [],
            name: '"before each" hook',
            status: 'broken',
          },
        ],
      },
      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
    ]);
  });

  it('should have non-success status of children hook - after each', () => {
    const steps = [
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },

      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"after each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"after each" hook',
        status: 'broken',
      },
      {
        attachments: [],
        name: '"after each" hook',
        status: 'passed',
      },
    ] as any;
    const res = wrapHooks('"after each" hook', steps);
    expect(res).toEqual([
      {
        attachments: [],
        name: '"before each" hook',
        status: 'passed',
      },
      {
        attachments: [],
        name: 'regular step',
        status: 'passed',
      },
      {
        attachments: [],
        name: '"after each" hooks',
        parameters: [],
        stage: 'finished',
        status: 'broken',
        statusDetails: {},
        steps: [
          {
            attachments: [],
            name: '"after each" hook',
            status: 'passed',
          },
          {
            attachments: [],
            name: '"after each" hook',
            status: 'broken',
          },
          {
            attachments: [],
            name: '"after each" hook',
            status: 'passed',
          },
        ],
      },
    ]);
  });
});
