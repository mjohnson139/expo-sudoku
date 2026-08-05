/**
 * The scrubber's tick track (docs/cube-plan.md §8.8, Step 8).
 *
 * One tick per move, grouped into the solve's phases, each group `flex`ed to the
 * number of moves in it. The current move is the only full-height tick.
 *
 * ### Why the grouping is worth the arithmetic
 *
 * An undifferentiated bar of 42 ticks says where you are and nothing else. Split
 * at the phase boundaries the operator has already marked (§8.5) and a drag
 * **lands inside the right block** — "take me back to the start of the second
 * block" becomes a gesture rather than a count. The groups come from
 * `phaseSpans`, which has produced exactly the `{ at, label, count }` this needs
 * since Step 6; nothing new is stored and nothing is stored twice.
 *
 * Pure, in its own module, for the reason everything else in this feature is:
 * the test runner has no React Native in it.
 */

/** A tick that has been played, but is not the one the cube is standing on. */
export const PLAYED = 'played';
/** The move the cube is standing on. The only full-height tick. */
export const CURRENT = 'current';
/** Not played yet. */
export const PENDING = 'pending';

/**
 * What each tick is, and which group it belongs to.
 *
 * @param {Array<{at: number, count: number, label: string}>} spans phase spans,
 *   or an empty list for a solve with no markers on it
 * @param {number} count how many moves the solve has
 * @param {number} index where the cube is — the number of moves played, so the
 *   *current* move is `index - 1` and position 0 has no current tick at all
 * @returns {Array<{at: number, count: number, label: string, ticks: string[]}>}
 *
 * A solve with no markers is one group covering everything, which is the same
 * shape rather than a special case for the renderer to branch on. Spans that do
 * not cover the whole solve — which `phaseSpans` will not produce, but a stale
 * save could — get a trailing group so no move loses its tick.
 */
export const tickGroups = (spans, count, index) => {
  const total = Number.isInteger(count) && count > 0 ? count : 0;
  if (total === 0) return [];

  const current = (Number.isInteger(index) ? index : 0) - 1;
  const stateAt = (i) => {
    if (i === current) return CURRENT;
    return i < current ? PLAYED : PENDING;
  };

  const groups = [];
  let cursor = 0;

  (spans || []).forEach((span) => {
    const at = Math.max(0, Math.min(total, span.at || 0));
    // A span that starts past where the last one ended leaves a hole; a span
    // with nothing in it (the boundary just opened) is not a group.
    const size = Math.max(0, Math.min(total, at + (span.count || 0)) - Math.max(at, cursor));
    if (size === 0) return;
    const start = Math.max(at, cursor);
    groups.push({
      at: start,
      count: size,
      label: span.label || '',
      ticks: Array.from({ length: size }, (_, i) => stateAt(start + i)),
    });
    cursor = start + size;
  });

  if (cursor < total) {
    groups.push({
      at: cursor,
      count: total - cursor,
      label: '',
      ticks: Array.from({ length: total - cursor }, (_, i) => stateAt(cursor + i)),
    });
  }

  return groups;
};

export default { tickGroups, PLAYED, CURRENT, PENDING };
