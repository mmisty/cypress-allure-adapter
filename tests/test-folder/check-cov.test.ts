import { checkCov } from '../../src/utils';

describe('suite', () => {
  it('test', () => {
    expect(checkCov('jest')).toEqual('jest');
  });
});
