import { tmsIssueUrl } from '@src/common';

describe('tmsIssueUrl', () => {
  it('issuePrefix not set', () => {
    expect(tmsIssueUrl({}, 'MY-1', 'issue')).toEqual('MY-1');
  });
  it('issuePrefix set', () => {
    expect(
      tmsIssueUrl({ issuePrefix: 'http://jira.com' }, 'MY-1', 'issue'),
    ).toEqual('http://jira.com/MY-1');
  });

  it('issuePrefix set link with http', () => {
    expect(
      tmsIssueUrl(
        { issuePrefix: 'http://jira.com' },
        'http://other/MY-1',
        'issue',
      ),
    ).toEqual('http://other/MY-1');
  });

  it('tmsPrefix not set', () => {
    expect(tmsIssueUrl({}, 'MY-1', 'tms')).toEqual('MY-1');
  });

  it('tmsPrefix set', () => {
    expect(
      tmsIssueUrl({ tmsPrefix: 'http://jira.com' }, 'MY-1', 'tms'),
    ).toEqual('http://jira.com/MY-1');
  });

  it('tmsPrefix set link with http', () => {
    expect(
      tmsIssueUrl({ tmsPrefix: 'http://jira.com' }, 'http://other/MY-1', 'tms'),
    ).toEqual('http://other/MY-1');
  });

  it('issuePrefix set with asterisk', () => {
    expect(
      tmsIssueUrl({ issuePrefix: 'http://jira.com/*/browse' }, 'MY-1', 'issue'),
    ).toEqual('http://jira.com/MY-1/browse');
  });

  it('issuePrefix set with slash', () => {
    expect(
      tmsIssueUrl({ issuePrefix: 'http://jira.com/' }, 'MY-1', 'issue'),
    ).toEqual('http://jira.com/MY-1');
  });

  it('tmsPrefix set with asterisk', () => {
    expect(
      tmsIssueUrl({ tmsPrefix: 'http://jira.com/*/browse' }, 'MY-1', 'tms'),
    ).toEqual('http://jira.com/MY-1/browse');
  });

  it('tmsPrefix set with slash', () => {
    expect(
      tmsIssueUrl({ tmsPrefix: 'http://jira.com/' }, 'MY-1', 'tms'),
    ).toEqual('http://jira.com/MY-1');
  });
});
