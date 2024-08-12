import { mergeStepsWithSingleChild } from '@src/plugins/helper';

describe('mergeStepsWithSingleChild', () => {
  it('nothing to merge', () => {
    const steps = [
      {
        name: '1',
        steps: [{ name: 'then', steps: [{ name: '3', steps: [] }] }],
      },
      { name: '2', steps: [] },
    ] as any;

    mergeStepsWithSingleChild(steps);

    expect(steps).toEqual([
      {
        name: '1',
        steps: [{ name: 'then', steps: [{ name: '3', steps: [] }] }],
      },
      { name: '2', steps: [] },
    ]);
  });

  it('should merge', () => {
    const steps = [
      {
        name: 'steps1',
        steps: [
          {
            name: 'steps1',
            steps: [
              { name: 'step1.1', steps: [] },
              { name: 'step1.2', steps: [] },
            ],
          },
        ],
      },
      { name: '2', steps: [] },
    ] as any;

    mergeStepsWithSingleChild(steps);

    expect(steps).toEqual([
      {
        name: 'steps1',
        steps: [
          {
            name: 'step1.1',
            steps: [],
          },
          {
            name: 'step1.2',
            steps: [],
          },
        ],
      },
      {
        name: '2',
        steps: [],
      },
    ]);
  });

  it('should merge several times', () => {
    const steps = [
      {
        name: 'steps1',
        steps: [
          {
            name: 'steps1',
            steps: [
              {
                name: 'steps1',
                steps: [
                  { name: 'step1.1', steps: [] },
                  { name: 'step1.2', steps: [] },
                ],
              },
            ],
          },
        ],
      },
      { name: '2', steps: [] },
    ] as any;

    mergeStepsWithSingleChild(steps);

    expect(steps).toEqual([
      {
        name: 'steps1',
        steps: [
          {
            name: 'step1.1',
            steps: [],
          },
          {
            name: 'step1.2',
            steps: [],
          },
        ],
      },
      {
        name: '2',
        steps: [],
      },
    ]);
  });

  it('should merge inner', () => {
    const steps = [
      {
        name: 'steps1',
        steps: [
          {
            name: 'steps2',
            steps: [
              {
                name: 'steps3',
                steps: [
                  {
                    name: 'step1.1',
                    steps: [
                      [
                        { name: 'step1.1', steps: [] },
                        { name: 'step1.2', steps: [] },
                      ],
                    ],
                  },
                  { name: 'step1.2', steps: [] },
                ],
              },
            ],
          },
        ],
      },
      { name: '2', steps: [] },
    ] as any;

    mergeStepsWithSingleChild(steps);

    expect(steps).toEqual([
      {
        name: 'steps1',
        steps: [
          {
            name: 'steps2',
            steps: [
              {
                name: 'steps3',
                steps: [
                  {
                    name: 'step1.1',
                    steps: [
                      [
                        {
                          name: 'step1.1',
                          steps: [],
                        },
                        {
                          name: 'step1.2',
                          steps: [],
                        },
                      ],
                    ],
                  },
                  {
                    name: 'step1.2',
                    steps: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: '2',
        steps: [],
      },
    ]);
  });

  // it('removeStepsByName', () => {
  //   const steps = [
  //     {
  //       name: 'steps1',
  //       steps: [
  //         {
  //           name: 'steps2',
  //           steps: [
  //             {
  //               name: 'steps3',
  //               steps: [
  //                 {
  //                   name: 'step1.1',
  //                   steps: [
  //                     [
  //                       { name: 'step1.1', steps: [] },
  //                       { name: 'step1.2', steps: [] },
  //                       { name: 'steps2', steps: [] },
  //                     ],
  //                   ],
  //                 },
  //                 { name: 'step1.2', steps: [] },
  //               ],
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //     { name: '2', steps: [] },
  //   ] as any;
  //   const res = removeStepsByName(steps, ['steps2']);
  //   expect(res).toEqual([
  //     {
  //       name: 'steps1',
  //       steps: [
  //         {
  //           name: 'steps3',
  //           steps: [
  //             {
  //               name: 'step1.1',
  //               steps: [
  //                 [
  //                   { name: 'step1.1', steps: [] },
  //                   { name: 'step1.2', steps: [] },
  //                 ],
  //               ],
  //             },
  //             { name: 'step1.2', steps: [] },
  //           ],
  //         },
  //       ],
  //     },
  //     { name: '2', steps: [] },
  //   ]);
  // });
});
