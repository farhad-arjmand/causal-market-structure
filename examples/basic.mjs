import { analyzeStructure } from '../dist/index.js';

const bars = [
  { openTime: 0, closeTime: 60_000, open: 10, high: 11, low: 9, close: 10 },
  { openTime: 60_000, closeTime: 120_000, open: 10, high: 13, low: 9, close: 12 },
  { openTime: 120_000, closeTime: 180_000, open: 12, high: 12, low: 10, close: 11 },
  { openTime: 180_000, closeTime: 240_000, open: 11, high: 15, low: 11, close: 14 },
];
console.log(JSON.stringify(analyzeStructure(bars, { swingLength: 1 }), null, 2));
