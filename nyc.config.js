const reportDir = process.env.COVERAGE_REPORT_DIR ?? 'coverage-nyc';
const tempDir = process.env.COVERAGE_TEMP ?? 'reports/.nyc_output';

module.exports = {
  all: true,
  cache: false,
  reporter: ['json', 'lcov'], // text
  include: ['src/**/*.*'],
  exclude: ['src/cypress', '*.types.ts', 'types.ts', 'src/**/types.ts', '*.d.ts', 'integration/**'],
  sourceMap: false,
  instrument: false,
  'report-dir': reportDir,
  'temp-dir': tempDir,
  branches: 80,
  lines: 60,
  functions: 60,
  statements: 80,
};
