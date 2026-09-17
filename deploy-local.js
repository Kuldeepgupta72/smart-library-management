'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const AdmZip = require('adm-zip');

const ROOT = __dirname;
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts');
const DEPLOY_DIR = path.join(ROOT, 'deploy');
const DB_PATH = path.join(ROOT, 'data', 'library.db');

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function findLatestArtifact() {
  if (!fs.existsSync(ARTIFACTS_DIR)) return null;
  const zips = fs.readdirSync(ARTIFACTS_DIR)
    .filter(f => f.endsWith('.zip'))
    .map(f => {
      const full = path.join(ARTIFACTS_DIR, f);
      return { full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return zips.length > 0 ? zips[0].full : null;
}

function main() {
  console.log('================================================');
  console.log('  Deploying Smart Library Management System (local)');
  console.log('================================================');

  // Find latest artifact
  const artifact = findLatestArtifact();
  if (!artifact) {
    console.error('ERROR: No zip artifact found in artifacts/. Run "npm run build:artifact" first.');
    process.exit(1);
  }
  console.log(`Artifact: ${path.relative(ROOT, artifact).replace(/\\/g, '/')}`);

  // 1. Clean and recreate deploy directory
  console.log('\n[1/4] Preparing deploy directory...');
  rmrf(DEPLOY_DIR);
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });
  console.log('      deploy/ ready.');

  // 2. Extract artifact
  console.log('\n[2/4] Extracting artifact into deploy/...');
  const zip = new AdmZip(artifact);
  zip.extractAllTo(DEPLOY_DIR, true);
  console.log('      Extracted.');

  // 3. Install production dependencies
  console.log('\n[3/4] Installing production dependencies...');
  execSync('npm install --omit=dev --no-audit --no-fund', { stdio: 'inherit', cwd: DEPLOY_DIR });
  console.log('      Production dependencies installed.');

  // 4. Start server — pointing at the persistent shared database
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  console.log('\n[4/4] Starting server...');
  console.log(`      Database : ${DB_PATH}`);
  console.log('      URL      : http://localhost:5050\n');
  spawnSync(process.execPath, ['dist/server.js'], {
    stdio: 'inherit',
    cwd: DEPLOY_DIR,
    env: { ...process.env, LIBRARY_DB_PATH: DB_PATH },
  });
}

main();
