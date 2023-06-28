/**
 * This is showcase how coverage is being merged
 * @param input
 */
export const checkCov = (input: string) => {
  if (input === 'cypress') {
    if (input === 'cypress') {
      return 'cypress';
    }

    return 'non-reachable';
  } else {
    return 'jest';
  }
};
