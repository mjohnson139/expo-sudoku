/**
 * hintPlacement.js — where the hint popover sits relative to the cell it points
 * at (docs/fungiku-plan.md §12.10).
 *
 * Pure, and separate from the component that draws it, for the same reason
 * `geometry.js` and `celebration.js` are: Jest here is plain node with no React
 * Native, so the only way this arithmetic gets tested is if it lives out here.
 * And it is arithmetic worth testing — an off-by-one in the tail leaves a
 * speech bubble pointing at the wrong mushroom, which is worse than not pointing
 * at all.
 *
 * ### The coordinate space
 *
 * Everything below is in **board coordinates**: (0, 0) is the top-left corner of
 * the tile grid, and the board is `cellSize * size` on a side. That is the same
 * space `cellFromPoint` resolves taps in, so a popover placed here and a finger
 * landing on a cell are talking about the same grid.
 *
 * ### The two rules
 *
 * 1. **Never cover the cell it points at.** A popover that hides its own subject
 *    is a worse hint than the bar at the bottom of the screen it replaced. So it
 *    goes *below* a cell in the board's top half and *above* one in the bottom
 *    half — which also keeps it on the board, because a cell in the top half
 *    always has half a board of room beneath it.
 * 2. **Never hang off the side.** The body is clamped to the board's width and
 *    the tail slides within the body to keep pointing at the cell. Those are two
 *    different clamps and both are needed: a cell in column 0 pushes the body
 *    against the left edge, and the tail then has to travel left *inside* it.
 */

/** The widest the bubble gets, before the board's own width caps it. */
export const POPOVER_MAX_WIDTH = 250;

/** Clear air between the bubble and the cell it points at. */
export const POPOVER_GAP = 8;

/** The pointer's size, before rotating it 45°. */
export const TAIL_SIZE = 12;

const clamp = (value, low, high) => Math.min(Math.max(value, low), Math.max(low, high));

/** How wide the bubble may be on this board. */
export function popoverWidth(boardSide) {
  return Math.min(POPOVER_MAX_WIDTH, boardSide);
}

/**
 * Where to put the bubble.
 *
 * @param {object} opts
 * @param {number} opts.cell     flat index of the cell being pointed at, or -1
 * @param {number} opts.size     board size N
 * @param {number} opts.cellSize the cell pitch in points
 * @returns {{side: 'above'|'below'|'none', left: number, width: number,
 *   top?: number, bottom?: number, tailLeft: number|null}}
 *   `top` is set for `below`, `bottom` for `above` — anchoring from the near edge
 *   means the placement never has to know the bubble's own height, which depends
 *   on how the message wraps and is not known until it has been laid out.
 */
export function popoverPlacement({ cell, size, cellSize }) {
  const boardSide = cellSize * size;
  const width = popoverWidth(boardSide);

  // A hint with no cell — "no single forced step from here" — is not pointing at
  // anything, so it gets no tail and sits across the middle of the board rather
  // than pretending to indicate a square.
  if (!Number.isInteger(cell) || cell < 0 || cell >= size * size) {
    return {
      side: 'none',
      left: Math.round((boardSide - width) / 2),
      top: Math.round(boardSide * 0.42),
      width,
      tailLeft: null,
    };
  }

  const row = Math.floor(cell / size);
  const col = cell % size;
  const centreX = (col + 0.5) * cellSize;

  const left = clamp(Math.round(centreX - width / 2), 0, boardSide - width);

  // Top half → below the cell; bottom half → above it. Never over it.
  const below = row < size / 2;

  // The tail tracks the cell's centre, but only as far as the body allows: it
  // must stay clear of the rounded corners at either end.
  const tailInset = TAIL_SIZE;
  const tailLeft = clamp(
    Math.round(centreX - left - TAIL_SIZE / 2),
    tailInset,
    width - tailInset - TAIL_SIZE
  );

  return below
    ? {
        side: 'below',
        left,
        width,
        tailLeft,
        top: Math.round((row + 1) * cellSize + POPOVER_GAP),
      }
    : {
        side: 'above',
        left,
        width,
        tailLeft,
        bottom: Math.round(boardSide - row * cellSize + POPOVER_GAP),
      };
}
