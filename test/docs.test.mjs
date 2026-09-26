import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
test('documentation map links resolve to tracked project paths', () => {
  const map=readFileSync(new URL('../llms.txt',import.meta.url),'utf8');
  const links=[...map.matchAll(/https:\/\/github\.com\/farhad-arjmand\/causal-market-structure\/blob\/main\/([^\s)]+)/g)];
  assert.ok(links.length >= 4);
  for(const [,path] of links) assert.ok(existsSync(new URL('../'+path,import.meta.url)),path);
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  assert.ok(readme.includes(pkg.name));
  assert.ok(readme.includes('v'+pkg.version));
  assert.equal(new Set(pkg.keywords).size,pkg.keywords.length);
});
