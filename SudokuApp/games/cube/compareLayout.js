/**
 * How wide the comparison's columns are (docs/cube-plan.md §8.10, Step 9).
 *
 * Pure, and in its own file for the reason `trackLayout.js` is: this is
 * arithmetic that decides whether the last phase of every solve is visible or
 * behind a swipe, and it is exactly the sort of thing worth pinning in a test
 * rather than reading off a screenshot at one width.
 */

/** Wide enough for `Solve 12` on one line, narrow enough to leave four Roux
 *  columns inside the 273 points the modal has at 320 — which it does by two
 *  points, so this is a measured number rather than a round one. */
export const NAME_WIDTH = 88;

/** The rule down the left of the open solve's row. Every row carries it, so it
 *  is part of the width whether or not it is the row wearing the accent. */
export const ROW_RULE = 3;

/** The narrowest a column goes before the table scrolls instead. Two digits at
 *  15pt and `Second` at 10pt both fit; below this they stop fitting, and a
 *  header that has to be guessed at is worse than one you have to swipe to. */
export const MIN_CELL = 44;

/** And the widest, so two phases do not sprawl into half a column each. */
export const MAX_CELL = 62;

/**
 * How wide a column is, given the room and the number of them.
 *
 * **Fit first, scroll second.** Four Roux phases at 320 points is the case this
 * screen exists for, and it fits — just — so the columns are sized to the room
 * rather than to a constant that would push `LSE` a few points off the edge and
 * hide the last phase of every solve behind a swipe nobody knew to make. Eight
 * columns (a Roux solve beside a CFOP one) genuinely do not fit, and that is
 * what the scroll is for.
 *
 * Before the first layout there is no width to divide up, so the columns start
 * at their widest and are measured down rather than up: a table that begins
 * cramped and grows is a visible flinch on open.
 */
export const cellWidth = (width, columns) => {
  if (!columns || !Number.isFinite(width) || width <= 0) return MAX_CELL;
  const each = (width - NAME_WIDTH - ROW_RULE) / columns;
  return Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(each)));
};

/** Whether the columns run past the right edge at that width — which is the
 *  only reason to tell anyone there is something to swipe for. */
export const tableScrolls = (width, columns) =>
  width > 0 && NAME_WIDTH + ROW_RULE + cellWidth(width, columns) * columns > width;

export default { NAME_WIDTH, ROW_RULE, MIN_CELL, MAX_CELL, cellWidth, tableScrolls };
