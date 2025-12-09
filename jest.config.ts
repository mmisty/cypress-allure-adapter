/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/en/configuration.html
 */
export default {
  // The directory where Jest should store its cached dependency information
  // cacheDirectory: "/private/var/folders/6f/d9kprl0960q717q05drlsg5w0000gn/T/jest_dx",

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  // collectCoverage: false,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'src/**/*.test.{ts,tsx}',
    'src/*.{ts,tsx}',
    '!**/lib/**',
    '!src/cypress/**',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/mocks.ts',
    '!**/types.ts',
    '!**/*.d.ts',
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'reports/coverage-jest',

  // Indicates which provider should be used to instrument code for coverage
  // coverageProvider: 'v8',

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ['json', 'text', 'lcov'],

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/src/**/*.test.ts',
    '**/tests/test-folder/**/?(*.)+(spec|test).[tj]s?(x)',
    '!**/tests/test-folder/allure-plugin/**/?(*.)+(spec|test).[tj]s?(x)',
    '!**/lib/**/*.*',
  ],
  moduleNameMapper: {
    '^@test-utils$': '<rootDir>/tests/cy-helper/utils.ts',
    '^@src/(.*)': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }],

    // A map from regular expressions to paths to transformers
    '.(ts)$': 'ts-jest',
  },

  setupFilesAfterEnv: ['./jest.setup.js'],
};
