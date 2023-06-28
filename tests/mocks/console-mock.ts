const doNothing = () => {
  // do nothing
};

export const consoleMock = () => ({
  log: jest.spyOn(console, 'log').mockImplementation(doNothing),
  warn: jest.spyOn(console, 'warn').mockImplementation(doNothing),
  error: jest.spyOn(console, 'error').mockImplementation(doNothing),
  debug: jest.spyOn(console, 'debug').mockImplementation(doNothing),
});
