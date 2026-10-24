/*
 * Copies the built web app into the desktop shell.
 *
 * The player is the same web app on every platform, so the desktop build is the
 * web build plus a native window — one code path, no second UI to keep in sync.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const from = path.join(root, '..', 'web', 'dist');
const to = path.join(root, 'app');

if (!fs.existsSync(from)) {
  console.error(`\n  The web app has not been built yet.\n  Run this first:  cd web && npm install && npm run build\n`);
  process.exit(1);
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`staged ${count(to)} files from web/dist into desktop/app`);
