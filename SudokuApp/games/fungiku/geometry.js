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

export default { cellFromPoint, cellsAlongLine };
