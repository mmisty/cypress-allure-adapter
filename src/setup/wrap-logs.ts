export const registerReporter = () => {
  const runner = (Cypress as any).mocha.getRunner() as Mocha.Runner;
};
