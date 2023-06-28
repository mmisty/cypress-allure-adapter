// jest tests to test plugins
import { configureEnv } from '../../src/plugins';
import PluginConfigOptions = Cypress.PluginConfigOptions;

describe('suite', () => {
  it('test', () => {
    configureEnv(() => {
      // nothing
    }, {} as PluginConfigOptions);
    expect(1).toEqual(1);
  });

  // when many test cases
  its('test its')
    .each([{ abc: 1 }, { abc: 2 }, { abc: 3 }])
    .run(t => {
      expect(t.abc).not.toBeUndefined();
    });
});
