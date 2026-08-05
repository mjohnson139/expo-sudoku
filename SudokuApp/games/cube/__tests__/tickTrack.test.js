/**
 * The scrubber's tick track — one tick per move, grouped by phase.
 */

import { CURRENT, PENDING, PLAYED, tickGroups } from '../tickTrack';
import { phaseSpans } from '../solveList';

const states = (groups) => groups.map((g) => g.ticks);
const sizes = (groups) => groups.map((g) => g.count);

describe('tickGroups', () => {
  it('has nothing to draw for a solve with no moves', () => {
    expect(tickGroups([], 0, 0)).toEqual([]);
    expect(tickGroups(null, 0, 0)).toEqual([]);
  });

  it('is one undivided group when nothing is annotated', () => {
    // The scramble, and every solve before the first marker. Same shape rather
    // than a special case for the renderer to branch on.
    const groups = tickGroups([], 4, 2);
    expect(sizes(groups)).toEqual([4]);
    expect(states(groups)).toEqual([[PLAYED, CURRENT, PENDING, PENDING]]);
  });

  it('gives one tick per move, however the phases fall', () => {
    const spans = [
      { at: 0, count: 8, label: 'First block' },
      { at: 8, count: 9, label: 'Second block' },
      { at: 17, count: 4, label: 'LSE' },
    ];
    const groups = tickGroups(spans, 21, 17);
    expect(sizes(groups)).toEqual([8, 9, 4]);
    expect(groups.reduce((n, g) => n + g.ticks.length, 0)).toBe(21);
  });

  it('makes the current move the only full-height tick', () => {
    const spans = [
      { at: 0, count: 8, label: 'First block' },
      { at: 8, count: 9, label: 'Second block' },
      { at: 17, count: 4, label: 'LSE' },
    ];
    const groups = tickGroups(spans, 21, 17);
    const all = groups.flatMap((g) => g.ticks);
    expect(all.filter((s) => s === CURRENT)).toHaveLength(1);
    // Position 17 means seventeen moves played, so the current one is index 16
    // — the last of the second block.
    expect(groups[1].ticks[groups[1].ticks.length - 1]).toBe(CURRENT);
    expect(groups[2].ticks.every((s) => s === PENDING)).toBe(true);
  });

  it('has no current tick at all at the start', () => {
    const groups = tickGroups([], 3, 0);
    expect(groups[0].ticks).toEqual([PENDING, PENDING, PENDING]);
  });

  it('has every tick played at the end', () => {
    const groups = tickGroups([], 3, 3);
    expect(groups[0].ticks).toEqual([PLAYED, PLAYED, CURRENT]);
  });

  it('carries the phase labels through', () => {
    const spans = [
      { at: 0, count: 2, label: 'First block' },
      { at: 2, count: 2, label: 'LSE' },
    ];
    expect(tickGroups(spans, 4, 1).map((g) => g.label)).toEqual(['First block', 'LSE']);
  });

  it('skips a boundary that has no moves in it yet', () => {
    // The marker written a moment ago. It is a real boundary and it is not a
    // group until something is in it — same rule the phase strip follows.
    const spans = [
      { at: 0, count: 3, label: 'First block' },
      { at: 3, count: 0, label: '' },
    ];
    expect(sizes(tickGroups(spans, 3, 3))).toEqual([3]);
  });

  it('never loses a move to spans that do not reach the end', () => {
    // `phaseSpans` will not produce this; a stale save could.
    const groups = tickGroups([{ at: 0, count: 2, label: 'First block' }], 5, 1);
    expect(sizes(groups)).toEqual([2, 3]);
    expect(groups.reduce((n, g) => n + g.ticks.length, 0)).toBe(5);
  });

  it('takes what `phaseSpans` produces, unchanged', () => {
    // The two have to agree, because the point of the split is that a drag
    // lands in the block the chips above it name.
    const phases = [
      { at: 0, label: 'First block' },
      { at: 8, label: 'Second block' },
    ];
    const spans = phaseSpans(phases, 21);
    const groups = tickGroups(spans, 21, 10);
    expect(sizes(groups)).toEqual(spans.map((s) => s.count));
    expect(groups.reduce((n, g) => n + g.ticks.length, 0)).toBe(21);
  });

  it('survives a position past the end of the solve', () => {
    const groups = tickGroups([], 3, 99);
    expect(groups[0].ticks).toEqual([PLAYED, PLAYED, PLAYED]);
  });
});
