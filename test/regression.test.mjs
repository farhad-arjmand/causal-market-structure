import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeStructure, stateAt } from '../dist/index.js';
const bars = [{openTime: 0, closeTime: 60, open: 1, high: 2, low: 0, close: 1}];
test('JavaScript callers cannot bypass availability with a malformed cutoff', () => {
  for (const asOf of ['wrong', '60', null, NaN, {}, true]) {
    assert.throws(() => analyzeStructure(bars, {asOf}), RangeError);
    assert.throws(() => stateAt([], asOf), RangeError);
  }
  assert.throws(() => stateAt([], undefined), RangeError);
});
test('finite cutoffs and explicit infinity sentinels retain their semantics', () => {
  assert.equal(analyzeStructure(bars, {asOf: 59}).processedBars, 0);
  assert.equal(analyzeStructure(bars, {asOf: 60}).processedBars, 1);
  assert.equal(analyzeStructure(bars, {asOf: -Infinity}).processedBars, 0);
  assert.equal(analyzeStructure(bars, {asOf: Infinity}).processedBars, 1);
});
test('late earlier receipt blocks later bars until its availability', () => {
  const delayed = [{...bars[0], availableAt: 300}, {...bars[0], openTime: 60, closeTime: 120}];
  assert.equal(analyzeStructure(delayed, {asOf: 299}).processedBars, 0);
  assert.equal(analyzeStructure(delayed, {asOf: 300}).processedBars, 2);
  assert.equal(analyzeStructure(delayed).processedThrough, 300);
});
