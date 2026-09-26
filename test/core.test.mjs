import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeStructure, stateAt, validateCandles } from '../dist/index.js';

const candles = rows => rows.map(([open, high, low, close], i) => ({ openTime: i * 60000,
  closeTime: (i + 1) * 60000, open, high, low, close }));
const fixture = candles([[9.5,10,9,9.5],[9.5,9.5,8,8.5],[8.5,11,8.5,10.8],
  [10.8,12,10,11.5],[11.5,11.5,10.5,11],[11,11.2,10.2,10.4],[10.4,11,10.3,10.6],
  [10.6,12.5,10.5,12.3],[12.3,12.8,12,12.6],[12.2,12.2,11.5,11.8],
  [11.8,11.9,10.1,10.3],[10.3,10.5,9.8,9.9]]);
function random(seed) { let s = seed; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
function walk(seed) {
  const rng = random(seed); let price = 100;
  return candles(Array.from({ length: 120 }, () => {
    const open = price, close = open + (rng() - 0.5) * 5; price = close;
    return [open, Math.max(open, close) + rng() * 3, Math.min(open, close) - rng() * 3, close];
  }));
}
test('strict pivot, BOS, later CHOCH, and zone lifecycle match a synthetic fixture', () => {
  const r = analyzeStructure(fixture, { swingLength: 1 });
  assert.deepEqual(r.events.map(e => e.type), ['SWING','SWING','SWING','BOS','ORDER_BLOCK',
    'SWING','ZONE_TOUCHED','CHOCH','ORDER_BLOCK']);
  assert.equal(r.events[0].knownAt, fixture[2].closeTime);
  assert.equal(r.events[3].level, 12);
  assert.equal(r.events[4].low, 10.2);
  assert.equal(r.state.trend, 'DOWN');
  assert.equal(r.state.activeZones.length, 1);
  assert.equal(stateAt(r.events, fixture[8].closeTime).trend, 'UP');
});
test('ties do not form strict pivots', () => {
  assert.equal(analyzeStructure(candles(Array(8).fill([1,2,0,1]))).events.length, 0);
});
test('empty input has no inferred trend', () => {
  assert.deepEqual(analyzeStructure([]).state, { trend: null, lastHigh: null, lastLow: null, lastBreak: null, activeZones: [] });
});
test('availability delay is cumulative and not backdated', () => {
  const bars = fixture.map(b => ({ ...b }));
  bars[0].availableAt = 900000;
  assert.equal(analyzeStructure(bars, { asOf: 899999 }).processedBars, 0);
  const full = analyzeStructure(bars, { swingLength: 1 });
  assert.ok(full.events.every(e => e.knownAt >= 900000));
  assert.equal(analyzeStructure(bars, { asOf: 900000 }).processedBars, bars.length);
});
test('future bars cannot change a past asOf view', () => {
  const options = { swingLength: 1, asOf: fixture[7].closeTime };
  assert.deepEqual(analyzeStructure(fixture, options), analyzeStructure(fixture.slice(0, 8), options));
});
test('both wick breaks use the pre-bar trend and are ambiguous', () => {
  const bars = candles([[2,3,1,2],[2,5,0,2],[2,4,1,2],[2,6,-1,2]]);
  const result = analyzeStructure(bars, { swingLength: 1, breakMode: 'wick' });
  const breaks = result.events.filter(e => e.type === 'BOS' || e.type === 'CHOCH');
  assert.equal(breaks.length, 2);
  assert.ok(breaks.every(e => e.ambiguous && e.previousTrend === null && e.type === 'BOS'));
  assert.equal(result.state.trend, 'UNKNOWN');
});
test('a gap past a zone is not an observed overlap', () => {
  const prefix = fixture.slice(0, 8);
  const next = { openTime: 480000, closeTime: 540000, open: 5, high: 6, low: 4, close: 5 };
  assert.equal(analyzeStructure([...prefix, next], { swingLength: 1 }).events.filter(e => e.type === 'ZONE_TOUCHED').length, 0);
});
test('invalid geometry, overlap, receipt clock and options reject', () => {
  assert.throws(() => validateCandles([{ ...fixture[0], high: 1 }]));
  assert.throws(() => validateCandles([fixture[0], fixture[0]]));
  assert.throws(() => validateCandles([{ ...fixture[0], closeTime: 0 }]));
  assert.throws(() => validateCandles([{ ...fixture[0], availableAt: 1 }]));
  assert.throws(() => analyzeStructure([], { swingLength: 0 }));
  assert.throws(() => analyzeStructure([], { breakMode: 'invalid' }));
  assert.throws(() => analyzeStructure([], { asOf: NaN }));
});
test('state reducer refuses unordered clocks and returns independent copies', () => {
  const events = analyzeStructure(fixture, { swingLength: 1 }).events;
  assert.throws(() => stateAt([...events].reverse(), Infinity));
  const state = stateAt(events, Infinity);
  state.lastHigh.level = -999;
  assert.notEqual(stateAt(events, Infinity).lastHigh.level, -999);
});
for (const mode of ['close', 'wick']) {
  test(`prefix invariance across 20 seeds and every prefix (${mode})`, () => {
    for (let seed = 1; seed <= 20; seed++) {
      const bars = walk(seed), original = JSON.stringify(bars);
      const full = analyzeStructure(bars, { breakMode: mode });
      for (let size = 1; size <= bars.length; size++) {
        const prefix = analyzeStructure(bars.slice(0, size), { breakMode: mode });
        assert.deepEqual(prefix.events, full.events.filter(e => e.barIndex < size));
        assert.deepEqual(prefix.state, stateAt(full.events, bars[size - 1].closeTime));
      }
      assert.equal(JSON.stringify(bars), original);
      for (const e of full.events) assert.equal(e.knownAt, bars[e.barIndex].closeTime);
    }
  });
}
