#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { ensureEasJson } = require('./fix-eas-json.cjs');

const { rewritten, path: configPath } = ensureEasJson();
if (rewritten) {
  console.log(`Repaired ${configPath} before invoking eas-cli.`);
}

const args = process.argv.slice(2);
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const spawnArgs = ['--yes', 'eas-cli', ...args];

if (process.env.EAS_WRAPPER_DRY_RUN === '1') {
  console.log(`[dry-run] ${executable} ${spawnArgs.join(' ')}`);
  process.exit(0);
}

const child = spawn(executable, spawnArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

child.on('error', (error) => {
  console.error('Failed to launch eas-cli via npx:', error);
  process.exit(1);
});