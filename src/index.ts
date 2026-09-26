/** All timestamps are integer epoch milliseconds; closeTime is exclusive. */
export interface Candle {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Actual receipt/availability time, never earlier than closeTime. */
  availableAt?: number;
}
export type Direction = 'BULLISH' | 'BEARISH';
export type Trend = 'UP' | 'DOWN' | 'UNKNOWN';
interface Clock { barIndex: number; knownAt: number }
export interface SwingEvent extends Clock {
  type: 'SWING'; side: 'HIGH' | 'LOW'; pivotIndex: number; level: number;
}
export interface BreakEvent extends Clock {
  type: 'BOS' | 'CHOCH'; direction: Direction; level: number;
  swingIndex: number; swingKnownAt: number;
  previousTrend: Trend | null; ambiguous: boolean;
}
export interface ZoneEvent extends Clock {
  type: 'ORDER_BLOCK' | 'ZONE_TOUCHED';
  id: number; direction: Direction; originIndex: number; low: number; high: number;
}
export type StructureEvent = SwingEvent | BreakEvent | ZoneEvent;
export interface StructureState {
  trend: Trend | null;
  lastHigh: SwingEvent | null;
  lastLow: SwingEvent | null;
  lastBreak: BreakEvent | null;
  activeZones: ZoneEvent[];
}
export interface StructureOptions {
  swingLength?: number;
  breakMode?: 'close' | 'wick';
  /** Only the chronologically available prefix is processed. */
  asOf?: number;
}

function timestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function validateCandles(bars: readonly Candle[]): void {
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    if (!b || !timestamp(b.openTime) || !timestamp(b.closeTime) || b.closeTime <= b.openTime ||
        ![b.open, b.high, b.low, b.close].every(Number.isFinite) ||
        b.high < Math.max(b.open, b.close, b.low) || b.low > Math.min(b.open, b.close, b.high)) {
      throw new RangeError(`Invalid candle at index ${i}`);
    }
    if (b.availableAt !== undefined && (!timestamp(b.availableAt) || b.availableAt < b.closeTime)) {
      throw new RangeError(`Invalid availability at index ${i}`);
    }
    if (i > 0 && b.openTime < bars[i - 1]!.closeTime) {
      throw new RangeError('Candles must be ordered and non-overlapping');
    }
  }
}

/** Reducer for an ordered append-only event stream. It never mutates input. */
export function stateAt(events: readonly StructureEvent[], asOf: number): StructureState {
  if (Number.isNaN(asOf)) throw new RangeError('asOf must not be NaN');
  let trend: Trend | null = null;
  let lastHigh: SwingEvent | null = null;
  let lastLow: SwingEvent | null = null;
  let lastBreak: BreakEvent | null = null;
  const zones = new Map<number, ZoneEvent>();
  let previous = -Infinity;
  for (const event of events) {
    if (!timestamp(event.knownAt) || event.knownAt < previous) throw new RangeError('Unordered event stream');
    previous = event.knownAt;
    if (event.knownAt > asOf) continue;
    switch (event.type) {
      case 'SWING':
        if (event.side === 'HIGH') lastHigh = { ...event };
        else lastLow = { ...event };
        break;
      case 'BOS': case 'CHOCH':
        trend = event.ambiguous ? 'UNKNOWN' : event.direction === 'BULLISH' ? 'UP' : 'DOWN';
        lastBreak = { ...event };
        break;
      case 'ORDER_BLOCK': zones.set(event.id, { ...event }); break;
      case 'ZONE_TOUCHED': zones.delete(event.id); break;
    }
  }
  return { trend, lastHigh, lastLow, lastBreak, activeZones: [...zones.values()] };
}

/**
 * Analyze supplied closed bars. A pivot is emitted only after k right bars.
 * knownAt includes cumulative receipt delay; missing receipt times assume close availability.
 * This batch function is causal, not an incremental or execution engine.
 */
export function analyzeStructure(bars: readonly Candle[], options: StructureOptions = {}) {
  const k = options.swingLength ?? 2;
  const mode = options.breakMode ?? 'close';
  const asOf = options.asOf ?? Infinity;
  if (!Number.isSafeInteger(k) || k < 1 || k > 10000) throw new RangeError('Invalid swingLength');
  if (mode !== 'close' && mode !== 'wick') throw new RangeError('Invalid breakMode');
  if (Number.isNaN(asOf)) throw new RangeError('Invalid asOf');
  validateCandles(bars);
  const events: StructureEvent[] = [];
  let high: (SwingEvent & { broken: boolean }) | null = null;
  let low: (SwingEvent & { broken: boolean }) | null = null;
  let trend: Trend | null = null;
  const zones = new Map<number, ZoneEvent>();
  let sequence = 0;
  let knownAt = 0;
  let processed = 0;
  let processedAt: number | null = null;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    knownAt = Math.max(knownAt, b.availableAt ?? b.closeTime);
    if (knownAt > asOf) break;
    processed++;
    processedAt = knownAt;
    const clock = { barIndex: i, knownAt };
    // Overlap is required. A gap completely past a zone is not an observed touch.
    for (const [id, zone] of zones) {
      if (b.low <= zone.high && b.high >= zone.low) {
        events.push({ ...zone, ...clock, type: 'ZONE_TOUCHED' });
        zones.delete(id);
      }
    }
    const p = i - k;
    if (p >= k) {
      const pivot = bars[p]!;
      let isHigh = true, isLow = true;
      for (let j = p - k; j <= p + k; j++) {
        if (j === p) continue;
        isHigh &&= pivot.high > bars[j]!.high;
        isLow &&= pivot.low < bars[j]!.low;
      }
      if (isHigh) {
        const event: SwingEvent = { ...clock, type: 'SWING', side: 'HIGH', pivotIndex: p, level: pivot.high };
        events.push(event); high = { ...event, broken: false };
      }
      if (isLow) {
        const event: SwingEvent = { ...clock, type: 'SWING', side: 'LOW', pivotIndex: p, level: pivot.low };
        events.push(event); low = { ...event, broken: false };
      }
    }
    const up = !!high && !high.broken && (mode === 'close' ? b.close : b.high) > high.level;
    const down = !!low && !low.broken && (mode === 'close' ? b.close : b.low) < low.level;
    const ambiguous = up && down;
    const previousTrend = trend;
    const emitBreak = (direction: Direction, swing: SwingEvent & { broken: boolean }, origin: number) => {
      swing.broken = true;
      const againstTrend = direction === 'BULLISH' ? previousTrend === 'DOWN' : previousTrend === 'UP';
      events.push({ ...clock, type: againstTrend ? 'CHOCH' : 'BOS', direction, level: swing.level,
        swingIndex: swing.pivotIndex, swingKnownAt: swing.knownAt, previousTrend, ambiguous });
      if (origin >= i) return;
      let pick = -1;
      for (let j = i - 1; j >= origin; j--) {
        const candidate = bars[j]!;
        if (direction === 'BULLISH' ? candidate.close < candidate.open : candidate.close > candidate.open) {
          pick = j; break;
        }
      }
      if (pick < 0) {
        pick = origin;
        for (let j = origin + 1; j < i; j++) {
          if (direction === 'BULLISH' ? bars[j]!.low < bars[pick]!.low : bars[j]!.high > bars[pick]!.high) pick = j;
        }
      }
      const zone: ZoneEvent = { ...clock, type: 'ORDER_BLOCK', id: sequence++, direction,
        originIndex: pick, low: bars[pick]!.low, high: bars[pick]!.high };
      zones.set(zone.id, zone); events.push(zone);
    };
    if (up && high) emitBreak('BULLISH', high, low?.pivotIndex ?? high.pivotIndex);
    if (down && low) emitBreak('BEARISH', low, high?.pivotIndex ?? low.pivotIndex);
    if (ambiguous) trend = 'UNKNOWN';
    else if (up) trend = 'UP';
    else if (down) trend = 'DOWN';
  }
  return { processedBars: processed, processedThrough: processedAt, events,
    state: stateAt(events, processedAt ?? -Infinity) };
}
