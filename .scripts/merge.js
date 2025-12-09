#!/usr/bin/env node
const yargs = require("yargs");
const path = require("path");
const istanbul = require('istanbul-lib-coverage');
const { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync} = require("fs");

// Default patterns (used when no config file is provided)
const DEFAULT_INCLUDE = ['src'];
const DEFAULT_EXCLUDE = ['integration', 'tests', 'node_modules', '.d.ts', 'cypress'];

/**
 * Load configuration from a file (supports .js, .json, .cjs)
 * @param {string} configPath - path to config file
 * @returns {object} configuration object
 */
function loadConfig(configPath) {
  const resolvedPath = path.resolve(configPath);
  
  if (!existsSync(resolvedPath)) {
    console.warn(`Config file not found: ${resolvedPath}, using defaults`);
    return {};
  }
  
  try {
    if (configPath.endsWith('.json')) {
      return JSON.parse(readFileSync(resolvedPath, 'utf8'));
    }
    // For .js and .cjs files
    return require(resolvedPath);
  } catch (err) {
    console.error(`Error loading config from ${resolvedPath}: ${err.message}`);
    return {};
  }
}

/**
 * this taken from @cypress/code-coverage
 * @param coverage object
 */
function fixSourcePaths(coverage) {
  Object.values(coverage).forEach((file) => {
    const { path: absolutePath, inputSourceMap } = file
    const fileName = /([^\/\\]+)$/.exec(absolutePath)[1]
    if (!inputSourceMap || !fileName) return
    
    if (inputSourceMap.sourceRoot) inputSourceMap.sourceRoot = ''
    inputSourceMap.sources = inputSourceMap.sources.map((source) =>
      source.includes(fileName) ? absolutePath : source
    )
  })
}

/**
 * this partly taken from @cypress/code-coverage
 * @param tempDir directory where to merge
 * @param fileWithCoverage file containing coverage
 */
function combineCoverage(tempDir, fileWithCoverage) {
  const fileToSave = `${tempDir}/combined.json`;
  
  const coverage = existsSync(fileToSave)
    ? JSON.parse(readFileSync(fileToSave, 'utf8'))
    : {};
  
  fixSourcePaths(coverage)
  
  const previousCoverage = existsSync(fileWithCoverage)
    ? JSON.parse(readFileSync(fileWithCoverage, 'utf8'))
    : {}
  
  const coverageMap = istanbul.createCoverageMap(previousCoverage)
  coverageMap.merge(coverage)
  
  writeFileSync(fileToSave, JSON.stringify(coverageMap, null, 2))
  console.log('combined coverage from `%s` with %s', fileToSave, fileWithCoverage)
}

/**
 * Check if a path matches any of the patterns
 * @param {string} filePath - normalized file path
 * @param {string[]} patterns - array of patterns to match
 * @returns {boolean}
 */
function matchesAnyPattern(filePath, patterns) {
  return patterns.some(pattern => {
    // Support glob-like patterns with **
    if (pattern.includes('**')) {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    }
    // Simple substring match (e.g., 'src', '.d.ts', 'integration')
    return filePath.includes(`/${pattern}/`) || 
           filePath.includes(`/${pattern}`) || 
           filePath.endsWith(pattern) ||
           filePath.startsWith(`${pattern}/`);
  });
}

/**
 * Normalize patterns - handle both string and array formats
 * @param {string|string[]} patterns
 * @returns {string[]}
 */
function normalizePatterns(patterns) {
  if (!patterns) return [];
  if (Array.isArray(patterns)) return patterns;
  if (typeof patterns === 'string') {
    return patterns.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Filter coverage data based on include/exclude patterns
 * @param {string} tempDir - directory with combined.json
 * @param {string[]} includePatterns - patterns to include (at least one must match)
 * @param {string[]} excludePatterns - patterns to exclude (none must match)
 */
function filterCoverage(tempDir, includePatterns, excludePatterns) {
  const fileToFilter = `${tempDir}/combined.json`;
  
  if (!existsSync(fileToFilter)) {
    console.log('No coverage file to filter');
    return;
  }
  
  const coverage = JSON.parse(readFileSync(fileToFilter, 'utf8'));
  const filtered = {};
  
  Object.keys(coverage).forEach(filePath => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Check if file matches include patterns (at least one)
    const isIncluded = includePatterns.length === 0 || matchesAnyPattern(normalizedPath, includePatterns);
    
    // Check if file matches any exclude pattern
    const isExcluded = matchesAnyPattern(normalizedPath, excludePatterns);
    
    if (isIncluded && !isExcluded) {
      filtered[filePath] = coverage[filePath];
    }
  });
  
  const originalCount = Object.keys(coverage).length;
  const filteredCount = Object.keys(filtered).length;
  
  console.log(`Filtered coverage: ${filteredCount}/${originalCount} files`);
  console.log(`  Include patterns: ${includePatterns.join(', ') || '(all)'}`);
  console.log(`  Exclude patterns: ${excludePatterns.join(', ') || '(none)'}`);
  
  writeFileSync(fileToFilter, JSON.stringify(filtered, null, 2));
}

/**
 * Create report by NYC library
 * @param tempDir dir where json files located
 * @param reportDir dir where to put report
 * @param config NYC configuration object
 */
function createReport(tempDir, reportDir, config){
  const NYC = require('nyc');
  
  // Merge provided config with required options
  const nycReportOptions = {
    ...config,
    reportDir: reportDir,
    tempDir: tempDir,
    // Ensure reporter is set
    reporter: config.reporter || ['json', 'lcov', 'text'],
  };
  
  const nyc = new NYC(nycReportOptions)
  
  nyc.report().then(()=> {
    console.log("Report created");
  })
}

/**
 * Remove directory sync
 * @param dir
 */
const removeDir = (dir) => {
  const pathResolved = path.resolve(dir)
  if(existsSync(pathResolved)){
    rmSync(pathResolved, {recursive: true});
  }
}

/**
 * Clear directory sync
 * @param dir
 */
const clearDir = (dir) => {
  const pathResolved = path.resolve(dir)
  if(existsSync(pathResolved)){
    rmSync(pathResolved, {recursive: true});
  }
  mkdirSync(pathResolved, {recursive: true});
}

const argv = yargs(process.argv.slice(2))
  .options({
    cypress: {
      type: 'string',
      demandOption: true,
      default: 'reports/coverage-cypress',
      describe: `Path to Cypress coverage report directory`,
    },
    jest: {
      type: 'string',
      demandOption: true,
      default: 'reports/coverage-jest',
      describe: `Path to Jest coverage report directory`,
    },
    out: {
      type: 'string',
      demandOption: true,
      default: 'reports/coverage-temp',
      describe: `Path to temp directory for merging`,
    },
    report: {
      type: 'string',
      demandOption: true,
      default: 'reports/coverage-full',
      describe: `Path to final report output`,
    },
    config: {
      type: 'string',
      default: '',
      describe: `Path to NYC config file (e.g., nyc.config.js). Supports .js, .cjs, .json`,
    },
    include: {
      type: 'string',
      default: '',
      describe: `Comma-separated patterns to include (overrides config file)`,
    },
    exclude: {
      type: 'string',
      default: '',
      describe: `Comma-separated patterns to exclude (overrides config file)`,
    },
    reporter: {
      type: 'string',
      default: '',
      describe: `Comma-separated reporters (e.g., "json,lcov,text"). Overrides config file`,
    },
    'no-filter': {
      type: 'boolean',
      default: false,
      describe: `Disable filtering (include all files)`,
    },
  })
  .alias('c', 'cypress')
  .alias('j', 'jest')
  .alias('i', 'include')
  .alias('e', 'exclude')
  .alias('h', 'help')
  .example('$0', 'Merge with default settings')
  .example('$0 --config nyc.config.js', 'Use NYC config file for include/exclude/reporter settings')
  .example('$0 --config nyc.config.js --include src', 'Use config but override include')
  .example('$0 --include src,lib --exclude tests', 'Custom include/exclude without config file')
  .example('$0 --no-filter', 'Include all files without filtering')
  .help('help')
  .parseSync();

console.log(' ======== MERGE COVERAGE REPORTS');

const { jest, cypress, out, report } = argv;
const outDir = path.resolve(out);
const reportDir = path.resolve(report);

// Load config file if specified
let config = {};
if (argv.config) {
  console.log(`Loading config from: ${argv.config}`);
  config = loadConfig(argv.config);
}

// Determine include/exclude patterns (CLI args override config file)
let includePatterns, excludePatterns;

if (argv['no-filter']) {
  includePatterns = [];
  excludePatterns = [];
} else {
  // Priority: CLI args > config file > defaults
  includePatterns = argv.include 
    ? normalizePatterns(argv.include)
    : normalizePatterns(config.include) || DEFAULT_INCLUDE;
    
  excludePatterns = argv.exclude
    ? normalizePatterns(argv.exclude)
    : normalizePatterns(config.exclude) || DEFAULT_EXCLUDE;
}

// Determine reporters
const reporters = argv.reporter
  ? normalizePatterns(argv.reporter)
  : normalizePatterns(config.reporter) || ['json', 'lcov', 'text', 'cobertura', 'clover'];

// Build final NYC config
const nycConfig = {
  ...config,
  include: includePatterns.length > 0 ? includePatterns.map(p => p.includes('*') ? p : `${p}/**/*.*`) : undefined,
  exclude: excludePatterns.length > 0 ? excludePatterns.map(p => p.includes('*') ? p : `**/${p}/**`) : undefined,
  reporter: reporters,
};

console.log('Configuration:');
console.log(`  Config file: ${argv.config || '(none)'}`);
console.log(`  Include: ${includePatterns.join(', ') || '(all)'}`);
console.log(`  Exclude: ${excludePatterns.join(', ') || '(none)'}`);
console.log(`  Reporters: ${reporters.join(', ')}`);

removeDir(reportDir);
clearDir(outDir);

combineCoverage(outDir, `${cypress}/coverage-final.json`);
combineCoverage(outDir, `${jest}/coverage-final.json`);

// Filter coverage based on patterns (unless --no-filter is set)
if (!argv['no-filter'] && (includePatterns.length > 0 || excludePatterns.length > 0)) {
  filterCoverage(outDir, includePatterns, excludePatterns);
}

createReport(outDir, reportDir, nycConfig);
