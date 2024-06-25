const fs = require('fs');
const packageJson = require('../package.json');

const packageName = 'cypress';
const prefix = 'latest%20supported%20';
const readmeFile =  'README.pack.md'
const version = packageJson.devDependencies[packageName].replace(/^[^0-9]+/, ''); // Extracts version number

const badgeUrl = `https://img.shields.io/badge/${prefix}${packageName}-${version}-blue`;

let readme = fs.readFileSync(readmeFile, 'utf8');
const badgeRegex = new RegExp(`https://img.shields.io/badge/${prefix}${packageName}-.*-blue`);
readme = readme.replace(badgeRegex, badgeUrl);

fs.writeFileSync(readmeFile, readme, 'utf8');

console.log(`Updated ${packageName} version badge to ${version}`);