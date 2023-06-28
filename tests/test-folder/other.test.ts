/**
 * @jest-environment jsdom
 */
import { something } from '../../src';
import { cyMock } from '../mocks/cy-mock';
import { consoleMock } from '../mocks/console-mock';

describe('dom', () => {
  it('test', () => {
    cyMock();
    const localConsole = consoleMock();

    something();
    expect(localConsole.log.mock.calls).toEqual([['log in console after got win']]);
  });
});
