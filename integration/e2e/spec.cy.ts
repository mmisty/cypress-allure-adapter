import { checkCov } from '../../src/utils';
import { something } from '../../src';

describe('empty spec @empty', { tags: '@empty' }, () => {
  it('passes @P1', () => {
    expect(checkCov('cypress')).eq('cypress');
  });

  it.skip('passes 2', () => {
    something();

    expect(something).not.to.throw();
  });
});
