import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const temporary = mkdtempSync(join(tmpdir(), 'public-package-smoke-'));
try {
  const [pack] = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], { encoding: 'utf8' }));
  const consumer = join(temporary, 'consumer');
  execFileSync('npm', ['install', '--prefix', consumer, '--ignore-scripts', '--package-lock=false',
    '--no-audit', '--no-fund', join(temporary, pack.filename)], { encoding: 'utf8' });
  const smoke = join(consumer, 'smoke.mjs');
  writeFileSync(smoke, 'import * as api from ' + JSON.stringify(metadata.name) +
    '; if (!Object.keys(api).length) throw new Error("Empty exports"); console.log(Object.keys(api).sort().join(","));\n');
  const exports = execFileSync(process.execPath, [smoke], { encoding: 'utf8', timeout: 5000 }).trim();
  assert.ok(exports.length);
  console.log('Isolated tarball import verified: ' + metadata.name + ' [' + exports + ']');
} finally {
  // Only this script's newly created temporary directory is removed.
  rmSync(temporary, { recursive: true, force: true });
}
