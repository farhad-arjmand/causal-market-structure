import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const temporary = mkdtempSync(join(tmpdir(), 'public-package-smoke-'));
try {
  const [pack] = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], { encoding: 'utf8', timeout: 60000 }));
  const consumer = join(temporary, 'consumer');
  execFileSync('npm', ['install', '--prefix', consumer, '--ignore-scripts', '--package-lock=false',
    '--no-audit', '--no-fund', join(temporary, pack.filename)], { encoding: 'utf8', timeout: 60000 });
  const installed = join(consumer, 'node_modules', metadata.name);
  for (const file of ['docs/API.md','llms.txt','CHANGELOG.md']) assert.ok(readFileSync(join(installed, file), 'utf8').length);
  const smoke = join(consumer, 'smoke.mjs');
  const checks = "const bars = [\n {openTime:0,closeTime:60,open:10,high:11,low:9,close:10},\n {openTime:60,closeTime:120,open:10,high:13,low:9,close:12},\n {openTime:120,closeTime:180,open:12,high:12,low:10,close:11},\n {openTime:180,closeTime:240,open:11,high:15,low:11,close:14},\n];\nconst result = api.analyzeStructure(bars,{swingLength:1});\nassert.equal(result.state.trend,'UP');\nassert.equal(api.stateAt(result.events,180).lastHigh.level,13);\nassert.throws(() => api.analyzeStructure(bars,{asOf:'bad'}),RangeError);";
  writeFileSync(smoke, 'import assert from "node:assert/strict";\nimport * as api from ' + JSON.stringify(metadata.name) + ';\n' + checks);
  execFileSync(process.execPath, [smoke], { encoding: 'utf8', timeout: 5000 });

  // Execute exactly what a reader copies from the packaged README, using public imports.
  const readme = readFileSync(join(installed, 'README.md'), 'utf8');
  const examples = [...readme.matchAll(/\x60\x60\x60js\r?\n([\s\S]*?)\x60\x60\x60/g)];
  assert.ok(examples.length, 'README must contain a runnable JavaScript example');
  for (const [i, match] of examples.entries()) {
    const path = join(consumer, 'readme-' + i + '.mjs');
    writeFileSync(path, match[1]);
    execFileSync(process.execPath, [path], { encoding: 'utf8', timeout: 5000 });
  }

  // Resolve declarations from the installed package rather than source-relative dist.
  const typed = readFileSync(new URL('../test/consumer.ts', import.meta.url), 'utf8')
    .replaceAll('../dist/index.js', metadata.name);
  const typedPath = join(consumer, 'consumer.mts');
  writeFileSync(typedPath, typed);
  const tsc = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
  execFileSync(process.execPath, [tsc, '--noEmit', '--strict', '--module', 'NodeNext',
    '--target', 'ES2022', typedPath], { encoding: 'utf8', timeout: 30000 });
  console.log('Isolated tarball verified: API assertions, ' + examples.length + ' README example(s), bundled docs and public TypeScript imports: ' + metadata.name);
} finally {
  // Only this script's newly created temporary directory is removed.
  rmSync(temporary, { recursive: true, force: true });
}
