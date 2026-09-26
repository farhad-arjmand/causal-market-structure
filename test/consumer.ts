import { analyzeStructure, type Candle, type StructureEvent } from '../dist/index.js';
const candles: Candle[] = [];
const events: StructureEvent[] = analyzeStructure(candles).events;
// @ts-expect-error Invalid break mode must fail type checking.
analyzeStructure(candles, { breakMode: 'market' });
void events;
