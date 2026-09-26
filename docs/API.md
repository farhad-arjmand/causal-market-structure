# API reference

## Import and runtime

Import named exports from `@farhadarjmand/causal-market-structure`. ESM only; Node.js 22+ is the tested runtime. No default export or CommonJS entry is provided. TypeScript declarations ship with the package. Browser bundling is not part of the supported test matrix.

## Candle

`{ openTime, closeTime, open, high, low, close, availableAt? }`

Times on candles are nonnegative safe-integer milliseconds. OHLC values must be finite numbers with low <= open/close <= high. Bars must be ordered, non-overlapping, and closed before analysis. Missing intervals are allowed, not synthesized. `availableAt >= closeTime`; omitting it assumes immediate close availability.

## validateCandles(bars): void

Throws `RangeError` on malformed candle geometry, invalid times, overlaps, ordering errors or invalid receipt times. Validates the whole supplied array, including bars after an analysis cutoff.

## analyzeStructure(bars, options?)

| Option | Default | Contract |
| --- | --- | --- |
| swingLength | 2 | Integer 1–10000. Both left and right confirmation windows have this length. |
| breakMode | close | `close` or `wick`; strict comparisons, not touches. |
| asOf | Infinity | Numeric cutoff. NaN and non-numbers throw; ±Infinity are explicit all/none sentinels. Finite fractional cutoffs are accepted. |

Returns `{ processedBars, processedThrough, events, state }`. Empty input returns 0, null, [], and an empty state. `processedThrough` is cumulative availability, not the last candle's close. The cutoff processes a chronological prefix: a delayed early receipt can hold later bars back.

## Event union

Every event has `barIndex` (the confirming/breaking/touching bar) and `knownAt` (availability).

| type | Additional fields |
| --- | --- |
| SWING | side HIGH/LOW, pivotIndex, level |
| BOS / CHOCH | direction BULLISH/BEARISH, level, swingIndex, swingKnownAt, previousTrend, ambiguous |
| ORDER_BLOCK / ZONE_TOUCHED | id, direction, originIndex, low, high |

A pivot's index is not its confirmation time. Zone IDs are deterministic **within one analyzed event stream**, not globally stable identifiers across different datasets or options. Zones use a documented candle heuristic; they do not establish actual resting orders.

## stateAt(events, asOf): StructureState

Reduces a generated, ordered event stream into `{ trend, lastHigh, lastLow, lastBreak, activeZones }`. Trend is UP, DOWN, UNKNOWN (ambiguous dual break), or null (none yet). Rejects invalid or decreasing event availability and invalid cutoffs. This is not a complete schema validator for arbitrary external event JSON; use events from the analyzer.

Returned state records are copied. Inputs are not modified. Future calls do not mutate earlier snapshots.

## Determinism and cost

No wall clock, I/O, randomness or external service. The batch algorithm can have quadratic worst-case origin/zone scans; bound input histories and do not describe it as an incremental stream processor. Causality applies to the supplied ordered history: revising an old candle changes the input and can change historical output.

## Troubleshooting

- No swing: wait for the right confirmation bars; equal highs/lows fail strict pivot rules.
- No break: only the latest unbroken confirmed swing per side is eligible.
- UNKNOWN trend: both levels broke within one wick-mode bar; no intrabar order is invented.
- No zone touch after a gap: the later range must actually overlap the zone.
- Too few processed bars: inspect cumulative availability and the cutoff, not just close times.
