#!/usr/bin/env node
// Sets the app version everywhere it is recorded:
//   node scripts/set-version.mjs 1.2.3
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const version = (process.argv[2] || '').replace(/^v/, '');
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
if (!match) {
  console.error('Usage: node scripts/set-version.mjs <major.minor.patch>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const pkg of ['package.json', 'client/package.json', 'server/package.json', 'electron/package.json']) {
  const file = join(root, pkg);
  // Replace only the top-level version line so formatting stays untouched
  const text = readFileSync(file, 'utf8');
  const updated = text.replace(/^(  "version": )"[^"]*"/m, `$1"${version}"`);
  if (updated === text && JSON.parse(text).version !== version) {
    throw new Error(`No version field found in ${pkg}`);
  }
  writeFileSync(file, updated);
}

// Android needs an ever-increasing integer too: 1.2.3 -> 1002003
const [, major, minor, patch] = match.map(Number);
const versionCode = major * 1_000_000 + minor * 1_000 + patch;
const gradle = join(root, 'android/app/build.gradle');
const text = readFileSync(gradle, 'utf8')
  .replace(/versionCode \d+/, `versionCode ${versionCode}`)
  .replace(/versionName "[^"]*"/, `versionName "${version}"`);
writeFileSync(gradle, text);

console.log(`Version set to ${version} (Android versionCode ${versionCode})`);
