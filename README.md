# Causal Market Structure

Append-only swing, break-of-structure, change-of-character, and price-zone events for closed OHLC bars.

**Experimental v0.1.1 · TypeScript · ESM · Node.js 22+ · MIT · zero runtime dependencies**

Unlike a retrospective chart annotation, an event records both the bar it refers to and when it became knowable. Adding future bars does not rewrite the historical event prefix.

[![CI](https://github.com/farhad-arjmand/causal-market-structure/actions/workflows/ci.yml/badge.svg)](https://github.com/farhad-arjmand/causal-market-structure/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40farhadarjmand%2Fcausal-market-structure)](https://www.npmjs.com/package/@farhadarjmand/causal-market-structure)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/farhad-arjmand/causal-market-structure/blob/main/LICENSE)

[API reference](https://github.com/farhad-arjmand/causal-market-structure/blob/main/docs/API.md) · [Changelog](https://github.com/farhad-arjmand/causal-market-structure/blob/main/CHANGELOG.md) · [Documentation map](https://github.com/farhad-arjmand/causal-market-structure/blob/main/llms.txt) · [Report an issue](https://github.com/farhad-arjmand/causal-market-structure/issues/new/choose)

## When to use this

Build point-in-time chart overlays, inspect confirmed swing events, or prepare features for a replay without backdating pivot confirmation. Supply closed OHLC bars and their actual receipt times when available.

This is not a trade signal generator, execution engine, or a guarantee against look-ahead bias elsewhere in your pipeline.

## Get started

Install the ESM package:

```sh
npm install @farhadarjmand/causal-market-structure
```

To build and test from source:

```sh
git clone https://github.com/farhad-arjmand/causal-market-structure.git
cd causal-market-structure
npm ci --ignore-scripts
npm run check
node examples/basic.mjs
```

```js
import { analyzeStructure, stateAt } from '@farhadarjmand/causal-market-structure';

const bars = [
  { openTime: 0, closeTime: 60000, open: 10, high: 11, low: 9, close: 10 },
  { openTime: 60000, closeTime: 120000, open: 10, high: 13, low: 9, close: 12 },
  { openTime: 120000, closeTime: 180000, open: 12, high: 12, low: 10, close: 11 },
  { openTime: 180000, closeTime: 240000, open: 11, high: 15, low: 11, close: 14 },
];
const result = analyzeStructure(bars, { swingLength: 1, breakMode: 'close' });
console.log(result.events);
console.log(stateAt(result.events, 180000).lastHigh?.level); // 13
```

Package: [`@farhadarjmand/causal-market-structure`](https://www.npmjs.com/package/@farhadarjmand/causal-market-structure).

## Clock contract

All times are nonnegative safe-integer epoch milliseconds. A bar spans **[openTime, closeTime)**: the close is exclusive. If a provider uses an inclusive end such as 59,999, convert it explicitly to 60,000.

`availableAt` optionally records the actual time a closed bar became available. It must not precede `closeTime`. Without it, analysis assumes availability at the close; that is a research assumption, not evidence of live delivery.

The event clock is the cumulative maximum of processed bar availability. A late earlier bar cannot be made knowable earlier by a subsequent on-time bar. `asOf` must be a number other than NaN; non-numeric cutoffs (including null) are rejected. Explicit ±Infinity means all/none. `asOf` processes only the chronological prefix available by that instant. Missing intervals are **not** inferred or filled; validate coverage separately.

## Definitions

| Event | Rule |
| --- | --- |
| SWING | Pivot is strictly higher/lower than k bars on either side; emitted when the kth right bar is available. Ties do not qualify. |
| BOS | Strict break of the latest confirmed unbroken swing, unless it reverses the previously known trend. |
| CHOCH | Break against the previously known UP/DOWN trend. |
| ORDER_BLOCK | A heuristic zone: last opposite-body candle between the opposing pivot origin and break, or the interval's directional extreme if none exists. Entire candle high/low is used. |
| ZONE_TOUCHED | A **later bar's range overlaps** an active zone. A gap wholly past the zone is not a touch. |

Close mode uses the close. Wick mode uses high/low but still emits at bar availability, never at a fabricated intrabar instant. If both sides break, both reference the same pre-bar trend and are marked `ambiguous`; resulting trend is UNKNOWN. Array order does not assert which break happened first.

Only the latest confirmed swing on each side is tracked for breaks. Older superseded swings are retained in events but are not additional active break levels. A swing breaks at most once.

“Order block” is a documented heuristic, not evidence of institutional orders or a fill guarantee. No volume, venue, execution, sizing, signal scoring, or trading policy is included.

## API

- `validateCandles(bars)`: rejects malformed OHLC, overlapping/unordered bars, and invalid availability.
- `analyzeStructure(bars, { swingLength = 2, breakMode = 'close', asOf = Infinity })`: returns processed bars, latest processed availability, events, and state.
- `stateAt(events, asOf)`: reduces an ordered event stream without modifying it.

Exported TypeScript types include `Candle`, `StructureEvent`, `SwingEvent`, `BreakEvent`, `ZoneEvent`, and `StructureState`.

This is a batch analyzer over supplied closed bars, not an incremental streaming accumulator. Re-running over an ever-growing history costs more work; worst-case zone/origin scans can be quadratic. Inputs and returned snapshots are not mutated by later calls, but callers can mutate their own returned objects.

## Verification and limitations

Tests cover synthetic exact event sequences, delayed availability, ambiguous wick breaks, zone gaps, input validation, and every prefix of seeded paths in both modes. Public implementations deliberately differ from the originating internal utility: strict timestamp validation, explicit receipt clocks, symmetric ambiguous-break attribution, and overlap-based zone touches.

No profitability, predictive accuracy, execution safety, or equivalence to a private trading model is claimed.

See [Contributing](https://github.com/farhad-arjmand/causal-market-structure/blob/main/CONTRIBUTING.md), [Provenance](https://github.com/farhad-arjmand/causal-market-structure/blob/main/NOTICE.md), and [MIT license](https://github.com/farhad-arjmand/causal-market-structure/blob/main/LICENSE).

## Integration and reproducibility

ESM named imports only; tested on Node.js 22 and 24. Types are bundled. Browser and CommonJS support are not claimed. The package includes `docs/API.md` and `llms.txt` so humans and coding assistants can inspect the installed version's contract offline. A documentation map does not guarantee search ranking or AI indexing.

For contributors, `npm run test:package` installs a freshly packed tarball in a temporary consumer, executes the README example, checks a functional assertion and type-checks imports by the public package name. Pin the package version and retain your input identity and options when comparing results.
