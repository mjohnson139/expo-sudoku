/**
 * Turning touch points into board cells.
 *
 * Pure functions, deliberately: this is the part of the drag gesture that can be
 * unit-tested, and gesture bugs are otherwise only findable on a device. The
 * component's job is reduced to "measure the board, hand over points".
 *
 * Nothing here knows about React Native — see FungikuBoard.js for the
 * PanResponder that feeds it, and docs/fungiku-plan.md §2 for the behavior spec.
 */

/**
 * How the room available for a board is divided up.
 *
 * Two things come out of one calculation, because they constrain each other:
 *
 * - **`pad`** — the card's margin, the band of gutter around the outside of the
 *   tiles. Derived from the *available width* rather than from the cell, which
 *   would be circular (the cell size depends on how much the padding leaves).
 *   Taking it from the available width also means the card is the same width at
 *   every board size, so switching 5×5 → 10×10 does not resize the frame.
 * - **`cell`** — a **whole number of pixels** (`Math.floor`) out of what is left.
 *
 * Both remainders have shown up on device as *"the border is cut off on the
 * sides"*:
 *
 * 1. A cell of `Math.floor(324 / 7)` = 46 makes a **322pt board**, not 324. The
 *    counter row above is width-matched to the board, and matching it to the
 *    *allowance* left it two pixels proud on each side.
 * 2. Without `pad`, the only thing outside the edge tiles was their own half-gap
 *    — half the space between two interior tiles. At 10×10 that is about a pixel,
 *    so the outer columns looked shaved while the interior ones did not.
 *
 * **Anything that claims to be board-width takes `outer` from here**, and the
 * board itself is `board` — they are not the same number.
 *
 * @param {number} available - px the layout is willing to give the whole card
 * @param {number} size - board size N
 * @returns {{pad: number, cell: number, board: number, outer: number}}
 */
export const boardExtent = (available, size) => {
  if (!(available > 0) || !(size > 0)) return { pad: 0, cell: 0, board: 0, outer: 0 };

  const pad = Math.max(3, Math.min(8, Math.round(available * 0.015)));
  const cell = Math.max(0, Math.floor((available - 2 * pad) / size));
  const board = cell * size;

  return { pad, cell, board, outer: board + 2 * pad };
};

/**
 * Which cell contains a point expressed **relative to the board's top-left**?
 *
 * @param {object} opts
 * @param {number} opts.x - px from the board's left edge
 * @param {number} opts.y - px from the board's top edge
 * @param {number} opts.cellSize - px per cell
 * @param {number} opts.size - board size N
 * @returns {number} flat cell index, or -1 when the point is off the board
 */
export const cellFromPoint = ({ x, y, cellSize, size }) => {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !(cellSize > 0) || !(size > 0)) {
    return -1;
  }

  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);

  if (row < 0 || col < 0 || row >= size || col >= size) return -1;

  return row * size + col;
};

/**
 * Every cell on the straight line between two cells, inclusive.
 *
 * A finger moving quickly delivers sparse move events — at speed you can jump
 * three cells between two frames. Without this, a fast sweep leaves gaps
 * (plan §2: "diagonal and fast strokes must fill every cell crossed"). Bresenham
 * over (row, col) is exact, integer-only, and handles diagonals.
 *
 * @returns {number[]} indices from `from` to `to`; `[]` if either is invalid
 */
export const cellsAlongLine = (from, to, size) => {
  if (!(size > 0)) return [];
  const total = size * size;
  if (!Number.isInteger(from) || !Number.isInteger(to)) return [];
  if (from < 0 || to < 0 || from >= total || to >= total) return [];
  if (from === to) return [from];

  let row = Math.floor(from / size);
  let col = from % size;
  const endRow = Math.floor(to / size);
  const endCol = to % size;

  const dRow = Math.abs(endRow - row);
  const dCol = Math.abs(endCol - col);
  const stepRow = row < endRow ? 1 : -1;
  const stepCol = col < endCol ? 1 : -1;

  let error = dCol - dRow;
  const cells = [];

  // Bounded by the grid's diagonal, so this cannot run away even if the
  // arithmetic is fed something unexpected.
  for (let guard = 0; guard <= dRow + dCol + 1; guard++) {
    cells.push(row * size + col);
    if (row === endRow && col === endCol) break;

    const doubled = 2 * error;
    if (doubled > -dRow) {
      error -= dRow;
      col += stepCol;
    }
    if (doubled < dCol) {
      error += dCol;
      row += stepRow;
    }
  }

  return cells;
};

export default { boardExtent, cellFromPoint, cellsAlongLine };
