/**
 * Color Loop's board arithmetic — where the tiles go, and which line a grab
 * landed on.
 *
 * Extracted out of `Board.tsx` (docs/colorloop-merge-plan.md §5), which is this
 * repo's own convention rather than a concession to the incoming code:
 * `games/fungiku/geometry.js` and `games/cube/geometry.js` are the same split,
 * for the same reason. The board component imports `Animated` and
 * `PanResponder`, and the node test runner cannot load either — but *"which line
 * did this grab land on"* is arithmetic that decides what the player touched,
 * which is exactly the kind of rule this repo keeps in a pure module and pins.
 *
 * Both functions arrive unchanged from the sibling app, `__tests__/board.test.ts`
 * with them.
 */

export interface BoardGeom {
  size: number;
  pad: number;
  gap: number;
  cell: number;
}

/**
 * The board's square and the grid inside it, for `n` tiles across `availWidth`.
 *
 * The 440 cap is the sibling app's and is kept, but **it is no longer the only
 * thing deciding how wide the board gets**: `ColorLoopScreen` sizes the room
 * from `useBoardSize({ fill: true })`, which knows the web page is a 600pt
 * centred column, and passes the result in. `min(width - 36, 440)` computed here
 * would put the board and the header in different places in a browser
 * (plan §10).
 */
export function computeGeom(availWidth: number, n: number): BoardGeom {
  const avail = Math.min(availWidth, 440);
  const pad = Math.round(avail * 0.045);
  const gap = Math.max(4, Math.round(avail * (n <= 4 ? 0.03 : 0.022)));
  const cell = Math.floor((avail - pad * 2 - gap * (n - 1)) / n);
  const size = pad * 2 + gap * (n - 1) + cell * n;
  return { size, pad, gap, cell };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Which line(s) a grab at board coordinates (bx, by) lands on; a grab within
 * `twin` fraction of a cell's edge straddles the seam and grabs both
 * neighbours.
 *
 * The coordinates are **board-space** — `pageX`/`pageY` minus the measured board
 * origin, never `locationX`/`locationY`, which on this architecture are relative
 * to the tile the finger landed on rather than to the board (plan §10).
 */
export function linesAt(
  n: number,
  geom: BoardGeom,
  twin: number,
  axis: 'row' | 'col',
  bx: number,
  by: number
): number[] {
  const step = geom.cell + geom.gap;
  const coord = axis === 'row' ? by : bx; // rows vary by y, columns by x
  const pc = clamp(Math.floor((coord - geom.pad) / step), 0, n - 1);
  const local = coord - geom.pad - pc * step;
  const seam = geom.cell * twin;
  if (seam <= 0) return [pc];
  if (local > geom.cell - seam && pc < n - 1) return [pc, pc + 1];
  if (local < seam && pc > 0) return [pc - 1, pc];
  return [pc];
}
