import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
test('import is silent and has no optional runtime setup', () => {
  const entry = new URL('../dist/index.js', import.meta.url).href;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e',
    'await import(' + JSON.stringify(entry) + ')'], { encoding: 'utf8', timeout: 5000 });
  assert.equal(output, '');
});
