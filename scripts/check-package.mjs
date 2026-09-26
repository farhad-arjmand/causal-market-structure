import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }));
for (const { path } of pack.files) assert.match(path, /^(dist\/[a-zA-Z0-9_./-]+\.(js|d\.ts)|README\.md|LICENSE|NOTICE\.md|package\.json)$/);
assert.ok(pack.files.some(f => f.path === 'dist/index.js'));
assert.ok(pack.files.some(f => f.path === 'dist/index.d.ts'));
console.log(`Package allowlist verified: ${pack.files.length} files, ${pack.unpackedSize} bytes.`);
