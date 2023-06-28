#!/usr/bin/env node
// This script
// - changes package.json files section to have proper imports in future
// - extracts directories from source folder (build folder where js was build to parent folder)
// - should be run only before publishing

const fs = require('fs');
const path = require('path');
const exec = require('child_process');
const chalk = require('chalk');
const yargs = require('yargs');

const argv = yargs(process.argv.slice(2))
  .options({
    source: {
      type: 'string',
      demandOption: true,
      describe: `source folder to extract`,
    },
    target: {
      type: 'string',
      demandOption: true,
      describe: `destination folder where extract`,
    },
    package: {
      type: 'string',
      demandOption: true,
      describe: `path to package json`,
    },
    undo: {
      type: 'boolean',
      demandOption: false,
      describe: `undo extraction`,
    },
  })
  .alias('s', 'source')
  .alias('t', 'target')
  .alias('p', 'package')
  .help('help')
  .parseSync();

const srcDir = argv.source;
const destDir = argv.target;
const packagePath = argv.package;
const isUndo = argv.undo;

const result = exec.execSync('git status').toString();
if (!isUndo && ['Changes not staged for commit', 'Untracked files'].some(t => result.indexOf(t) !== -1)) {
  console.log(result);
  throw new Error('Please commit/stash changes before preforming the operation');
} else {
  console.log(result);
}

if (!fs.existsSync(packagePath)) {
  throw new Error('package.json does not exist by specified path:' + packagePath + ', CWD:' + process.cwd());
}

const pack = JSON.parse(fs.readFileSync(packagePath));

const sourcePath = srcDir;
const targetPath = destDir;
const itemsSource = fs.readdirSync(sourcePath);
const itemsDest = fs.readdirSync(targetPath);
const dirsOrFileList = [];
let isHaveDuplicatedNames = false;
const duplicateItems = [];

itemsSource.forEach(d => {
  try {
    itemsDest.forEach(destEntry => {
      if (destEntry === d) {
        duplicateItems.push(d);
        isHaveDuplicatedNames = true;
      }
    });

    const srcFile = path.join(sourcePath, d);
    if (fs.lstatSync(srcFile).isDirectory()) {
      dirsOrFileList.push({ isDir: true, path: `${d}/**`, pathName: d });
    } else {
      if (d.endsWith('.js') || d.endsWith('.d.ts')) {
        dirsOrFileList.push({ isDir: false, path: d, pathName: d });
      }
    }
  } catch (e) {
    // ignore
  }
});

if (!isUndo && isHaveDuplicatedNames) {
  console.warn(
    `Be sure that directory '${path.resolve(
      targetPath,
    )}' doesn't have items with the same name that are in '${path.resolve(srcDir)}'`,
  );
  console.warn(
    chalk.bold(
      `Duplicate items in destination '${path.resolve(targetPath)}': [${chalk.red(duplicateItems.join(', '))}]`,
    ) +
      `\nItems in source '${path.resolve(sourcePath)}': [${dirsOrFileList.map(t => t.pathName).join(', ')}]` +
      `\n\nTry to run the same command with --undo if you've already ran extract before and ` +
      `sure that listed items are not be overwritten\n` +
      `Be careful: it willl delete files/folder with the sme names as ${path.resolve(sourcePath)}`,
  );

  const message = `Could not extract because destination already have [${duplicateItems.join(', ')}]`;
  throw new Error(message);
}

if(!pack.files){
  pack.files = [];
}

dirsOrFileList.forEach(d => {
  if (!isUndo && !pack.files.includes(d.path)) {
    pack.files.push(d.path);
  }

  if (isUndo && pack.files.includes(d.path)) {
      pack.files.splice(pack.files.indexOf(d.path), 1);
      
   if(pack.files.length === 0){
     delete pack.files;
   }
  }
});

console.log(`Package path: ${path.resolve(packagePath)}`);
console.log('new package.json files:', pack.files);
fs.writeFileSync(packagePath, JSON.stringify(pack, null, '  '));
console.log(chalk.bold('Written package json with files'));

if (!isUndo) {
  const srcArgs = `${sourcePath}/**`;
  console.log(chalk.bold(`Will copy ${srcArgs} to ${targetPath}`));

  // copy files from child to targetPath (parent)
  exec.execSync(`cp -vfr ${srcArgs} ${targetPath}`);
  console.log(chalk.bold(`Copied [${dirsOrFileList.map(p => p.path).join(', ')}] from ${sourcePath}`));
} else {
  dirsOrFileList.forEach(d => {
    const itemPath = path.resolve(path.join(targetPath, d.pathName));
    if (fs.existsSync(itemPath)) {
      console.log(chalk.bold(`Will delete '${itemPath}'`));
      exec.execSync(`rm -rf ${itemPath}`);
    }
  });
}
