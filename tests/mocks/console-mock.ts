const doNothing = () => {
  // do nothing
};

export const consoleMock = (impl: (...args: string[]) => void = doNothing) => ({
  log: jest.spyOn(console, 'log').mockImplementation(impl),
  warn: jest.spyOn(console, 'warn').mockImplementation(impl),
  error: jest.spyOn(console, 'error').mockImplementation(impl),
  debug: jest.spyOn(console, 'debug').mockImplementation(impl),
  trace: jest.spyOn(console, 'trace').mockImplementation(impl),
});
