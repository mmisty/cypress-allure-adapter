import { logTask } from '../../../src/plugins/tasks/log.task';
import { consoleMock } from '../../mocks/console-mock';

describe('suite', () => {
  it('test', () => {
    const console = consoleMock();
    logTask('message here');

    expect(console.log.mock.calls[0]).toEqual(['message here']);
  });
});
