'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ZipArchive } = require('archiver');

const ROOT = __dirname;
const APP_NAME = 'smart-library-management';
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts');

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main() {
  const artifactName = `${APP_NAME}-build-${timestamp()}.zip`;
  const artifactPath = path.join(ARTIFACTS_DIR, artifactName);

  console.log('================================================');
  console.log(`  Building ${APP_NAME}`);
  console.log('================================================');

  // 1. Clean previous build output
  console.log('\n[1/6] Cleaning previous build output...');
  rmrf(path.join(ROOT, 'dist'));
  if (fs.existsSync(ARTIFACTS_DIR)) {
    for (const f of fs.readdirSync(ARTIFACTS_DIR)) {
      if (f.endsWith('.zip')) fs.rmSync(path.join(ARTIFACTS_DIR, f));
    }
  }
  console.log('      Cleaned dist/ and old .zip artifacts.');

  // 2. Install dependencies
  console.log('\n[2/6] Installing dependencies...');
  run('npm install');
  console.log('      Dependencies installed.');

  // 3. TypeScript build
  console.log('\n[3/6] Running TypeScript build...');
  run('npm run build');
  console.log('      TypeScript build complete.');

  // 4. Verify dist/server.js
  console.log('\n[4/6] Verifying build output...');
  if (!fs.existsSync(path.join(ROOT, 'dist', 'server.js'))) {
    console.error('ERROR: dist/server.js not found after build. Compilation may have failed.');
    process.exit(1);
  }
  console.log('      dist/server.js verified.');

  // 5. Create versioned zip artifact
  console.log('\n[5/6] Packaging artifact...');
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const stagedFiles = ['dist/', 'public/', 'package.json'];
  const lockFile = path.join(ROOT, 'package-lock.json');
  if (fs.existsSync(lockFile)) stagedFiles.push('package-lock.json');
  console.log(`      Including: ${stagedFiles.join(', ')}`);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(artifactPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    archive.directory(path.join(ROOT, 'dist'), 'dist');
    archive.directory(path.join(ROOT, 'public'), 'public');
    archive.file(path.join(ROOT, 'package.json'), { name: 'package.json' });
    if (fs.existsSync(lockFile)) {
      archive.file(lockFile, { name: 'package-lock.json' });
    }

    archive.finalize();
  });

  // 6. Report
  console.log('\n[6/6] Verifying artifact...');
  const size = formatBytes(fs.statSync(artifactPath).size);
  const relPath = path.relative(ROOT, artifactPath).replace(/\\/g, '/');

  console.log('\n================================================');
  console.log('  BUILD SUCCESSFUL');
  console.log(`  Artifact : ${relPath}`);
  console.log(`  Size     : ${size}`);
  console.log('================================================\n');
}

main().catch(err => {
  console.error('\nBuild failed:', err.message);
  process.exit(1);
});
