import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const decoder = new TextDecoder('utf-8', { fatal: true });
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const targetRoot = process.argv[2] ? path.resolve(process.argv[2]) : repoRoot;

const IGNORED_DIRS = new Set([
  '.git',
  '.expo',
  '.github',
  '.vscode',
  'node_modules',
  'dist',
  'build',
  'android',
  'ios',
]);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.mp4',
  '.mp3',
  '.wav',
  '.aab',
  '.apk',
  '.keystore',
]);

function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function isHiddenDir(name) {
  return name.startsWith('.') && !['.expo', '.github', '.vscode'].includes(name);
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || isHiddenDir(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      yield path.join(dir, entry.name);
    }
  }
}

async function checkUtf8(filePath) {
  const buffer = await readFile(filePath);
  try {
    decoder.decode(buffer);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const candidates = [];
  for await (const filePath of walk(targetRoot)) {
    if (isBinaryFile(filePath)) continue;
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) continue;
    candidates.push(filePath);
  }

  const failures = [];
  for (const filePath of candidates) {
    const ok = await checkUtf8(filePath);
    if (!ok) {
      failures.push(path.relative(repoRoot, filePath));
    }
  }

  if (failures.length > 0) {
    console.error('❌ Non UTF-8 files detected:');
    for (const file of failures) {
      console.error(` - ${file}`);
    }
    console.error('\nConvert them to UTF-8 (e.g., via VS Code) then re-run this check.');
    process.exitCode = 1;
  } else {
    console.log('✅ All checked files are UTF-8 encoded.');
  }
}

main().catch((err) => {
  console.error('Encoding check failed:', err);
  process.exitCode = 1;
});
