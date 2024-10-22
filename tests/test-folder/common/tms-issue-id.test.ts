import { descriptionId } from '@src/common';

describe('descriptionId', () => {
  it('issuePrefix not set', () => {
    expect(descriptionId({}, 'MY-1', 'issue')).toEqual('MY-1');
  });

  it('issuePrefix not set, desc set', () => {
    expect(descriptionId({}, 'MY-1', 'issue', 'desc')).toEqual('desc');
  });

  it('issuePrefix set', () => {
    expect(
      descriptionId({ issuePrefix: 'http://jira.com' }, 'MY-1', 'issue'),
    ).toEqual('MY-1');
  });

  it('issuePrefix set, desc set', () => {
    expect(
      descriptionId(
        { issuePrefix: 'http://jira.com' },
        'MY-1',
        'issue',
        'desc',
      ),
    ).toEqual('MY-1: desc');
  });

  it('issuePrefix set link with http', () => {
    expect(
      descriptionId(
        { issuePrefix: 'http://jira.com' },
        'http://other/MY-1',
        'issue',
      ),
    ).toEqual('http://other/MY-1');
  });

  it('issuePrefix set link with http, with desc', () => {
    expect(
      descriptionId(
        { issuePrefix: 'http://jira.com' },
        'http://other/MY-1',
        'issue',
        'desc',
      ),
    ).toEqual('desc');
  });

  it('tmsPrefix not set', () => {
    expect(descriptionId({}, 'MY-1', 'tms')).toEqual('MY-1');
  });

  it('tmsPrefix not set, desc set', () => {
    expect(descriptionId({}, 'MY-1', 'tms', 'desc')).toEqual('desc');
  });

  it('tmsPrefix set', () => {
    expect(
      descriptionId({ tmsPrefix: 'http://jira.com' }, 'MY-1', 'tms'),
    ).toEqual('MY-1');
  });

  it('tmsPrefix set, desc set', () => {
    expect(
      descriptionId({ tmsPrefix: 'http://jira.com' }, 'MY-1', 'tms', 'desc'),
    ).toEqual('MY-1: desc');
  });

  it('tmsPrefix set link with http', () => {
    expect(
      descriptionId(
        { tmsPrefix: 'http://jira.com' },
        'http://other/MY-1',
        'tms',
      ),
    ).toEqual('http://other/MY-1');
  });

  it('tmsPrefix set link with http, desc set', () => {
    expect(
      descriptionId(
        { tmsPrefix: 'http://jira.com' },
        'http://other/MY-1',
        'tms',
        'desc',
      ),
    ).toEqual('desc');
  });

  it('issuePrefix set with asterisk', () => {
    expect(
      descriptionId(
        { issuePrefix: 'http://jira.com/*/browse' },
        'MY-1',
        'issue',
      ),
    ).toEqual('MY-1');
  });

  it('issuePrefix set with asterisk, desc set', () => {
    expect(
      descriptionId(
        { issuePrefix: 'http://jira.com/*/browse' },
        'MY-1',
        'issue',
        'desc',
      ),
    ).toEqual('MY-1: desc');
  });

  it('issuePrefix set with slash', () => {
    expect(
      descriptionId({ issuePrefix: 'http://jira.com/' }, 'MY-1', 'issue'),
    ).toEqual('MY-1');
  });

  it('issuePrefix set with slash, desc set', () => {
    expect(
      descriptionId(
        { issuePrefix: 'http://jira.com/' },
        'MY-1',
        'issue',
        'desc',
      ),
    ).toEqual('MY-1: desc');
  });

  it('tmsPrefix set with asterisk', () => {
    expect(
      descriptionId({ tmsPrefix: 'http://jira.com/*/browse' }, 'MY-1', 'tms'),
    ).toEqual('MY-1');
  });

  it('tmsPrefix set with asterisk, desc set', () => {
    expect(
      descriptionId(
        { tmsPrefix: 'http://jira.com/*/browse' },
        'MY-1',
        'tms',
        'desc',
      ),
    ).toEqual('MY-1: desc');
  });

  it('tmsPrefix set with slash', () => {
    expect(
      descriptionId({ tmsPrefix: 'http://jira.com/' }, 'MY-1', 'tms'),
    ).toEqual('MY-1');
  });

  it('tmsPrefix set with slash, desc set', () => {
    expect(
      descriptionId({ tmsPrefix: 'http://jira.com/' }, 'MY-1', 'tms', 'desc'),
    ).toEqual('MY-1: desc');
  });
});
