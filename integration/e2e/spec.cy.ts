describe('empty spec @empty', { tags: '@empty' }, () => {
  it('passes @P1', () => {
    expect('cypress').eq('cypress');
  });

  it.skip('passes 2', () => {
    expect(() => {
      // any
    }).not.to.throw();
  });
});
