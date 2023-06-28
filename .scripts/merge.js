#!/usr/bin/env node
const yargs = require("yargs");
const path = require("path");
const istanbul = require('istanbul-lib-coverage');
const { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync} = require("fs");

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
 * Create report by NYC library,
 * Will not read nyc config and temp dic from nyc.config.js
 * @param tempDir dir where json files located
 * @param reportDir dir where to put report
 * @param reporterArr array with reporters like ['json', 'lcov', 'text']
 */
function createReport(tempDir, reportDir, reporterArr){
  const NYC = require('nyc');
  const nycReportOptions = {
    reportDir: reportDir,
    tempDir: tempDir,
    reporter: reporterArr ?? ['json', 'lcov', 'text'],
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
      describe: `Path to coverage reports directory (relative to current working directory)
      Path with directories - each of them should contain coverage report (coverage-final.json)`,
    },
    jest: {
      type: 'string',
      demandOption: true,
      default: 'reports/coverage-jest',
      describe: `Path to jet coverage report, should contain coverage report (coverage-final.json)`,
    },
    out: {
      type: 'string',
      demandOption: true,
      default: 'reports/coverage-temp',
      describe: `Path to final report`,
    },
    report: {
      type: 'string',
      demandOption: true,
      default: 'reports/coverage-full',
      describe: `Path to final report`,
    },
  })
  .alias('c', 'cypress')
  .alias('j', 'jest')
  .alias('h', 'help')
  .help('help')
  .parseSync();

console.log(' ======== MERGE COVERAGE REPORTS');

const { jest, cypress, out, report } = argv;
const outDir = path.resolve(out);
const reportDir = path.resolve(report);

removeDir(reportDir);
clearDir(outDir);

combineCoverage(outDir, `${cypress}/coverage-final.json`);
combineCoverage(outDir, `${jest}/coverage-final.json`);
createReport(outDir, reportDir, ['json', 'lcov', 'text', 'cobertura', 'clover']);