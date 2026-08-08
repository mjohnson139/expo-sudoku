import { mulberry32 } from '../../utils/rng';

/**
 * Number Slide's pure core — the 15-puzzle at 3×3.
 *
 * Ported unchanged from the sibling color-loop app (plan §2: the engines move
 * nearly untouched). Everything in here is arithmetic with no React and no
 * React Native, which is what lets the 17 incoming cases run in this repo's
 * plain node test environment (plan §5) — the same rule
 * `games/fungiku/geometry.js` and `games/cube/geometry.js` already follow.
 *
 * `nsShuffle` is seeded, so a board is a pure function of its code and the
 * string `K7P2Q` *is* the puzzle on every device. Changing the scramble walk
 * would move every board a code has ever produced.
 */

export type NSBoard = number[][]; // 0 = the gap
export type NSDir = 'up' | 'down' | 'left' | 'right';

export const NS_SOLVED: NSBoard = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 0],
];

export interface NSState {
  board: NSBoard;
  empty: { r: number; c: number };
}

function findEmpty(board: NSBoard): { r: number; c: number } {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) if (board[r][c] === 0) return { r, c };
  throw new Error('no gap');
}

export function nsIsSolved(board: NSBoard): boolean {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) if (board[r][c] !== NS_SOLVED[r][c]) return false;
  return true;
}

/**
 * Slide the tile at (tr,tc) — and any tiles between it and the gap — toward
 * the gap. Returns the new state and which tiles moved, or null if the tap
 * wasn't in line with the gap.
 */
export function nsSlideAt(
  state: NSState,
  tr: number,
  tc: number
): { state: NSState; moved: number[] } | null {
  const { r: er, c: ec } = state.empty;
  const board = state.board.map((row) => [...row]);
  const moved: number[] = [];

  if (tr === er && tc !== ec) {
    const step = ec > tc ? 1 : -1;
    let c = ec;
    while (c !== tc) {
      board[er][c] = board[er][c - step];
      moved.push(board[er][c]);
      c -= step;
    }
    board[er][tc] = 0;
    return { state: { board, empty: { r: er, c: tc } }, moved };
  }
  if (tc === ec && tr !== er) {
    const step = er > tr ? 1 : -1;
    let r = er;
    while (r !== tr) {
      board[r][ec] = board[r - step][ec];
      moved.push(board[r][ec]);
      r -= step;
    }
    board[tr][ec] = 0;
    return { state: { board, empty: { r: tr, c: ec } }, moved };
  }
  return null; // not in line with the gap
}

/** Slide in a swipe direction: the tile adjacent to the gap moves into it. */
export function nsMoveDir(state: NSState, dir: NSDir): { state: NSState; moved: number[] } | null {
  const { r, c } = state.empty;
  const target: Record<NSDir, [number, number]> = {
    up: [r + 1, c],
    down: [r - 1, c],
    left: [r, c + 1],
    right: [r, c - 1],
  };
  const [tr, tc] = target[dir];
  if (tr < 0 || tr > 2 || tc < 0 || tc > 2) return null;
  return nsSlideAt(state, tr, tc);
}

/** Seeded scramble: a random gap walk that never undoes its previous step. */
export function nsShuffle(seed: number): NSState {
  const rng = mulberry32(seed >>> 0);
  const board = NS_SOLVED.map((row) => [...row]);
  let empty = findEmpty(board);
  let last: { r: number; c: number } | null = null;
  for (let i = 0; i < 160; i++) {
    const opts: [number, number][] = [];
    const { r, c } = empty;
    if (r > 0) opts.push([r - 1, c]);
    if (r < 2) opts.push([r + 1, c]);
    if (c > 0) opts.push([r, c - 1]);
    if (c < 2) opts.push([r, c + 1]);
    const pick = opts[Math.floor(rng() * opts.length)];
    if (last && pick[0] === last.r && pick[1] === last.c && opts.length > 1) {
      i--;
      continue;
    }
    last = { r: empty.r, c: empty.c };
    board[empty.r][empty.c] = board[pick[0]][pick[1]];
    board[pick[0]][pick[1]] = 0;
    empty = { r: pick[0], c: pick[1] };
  }
  if (nsIsSolved(board)) {
    const t = board[2][1];
    board[2][1] = board[2][0];
    board[2][0] = t;
    empty = findEmpty(board);
  }
  return { board, empty };
}

/**
 * Resolve a page-coordinate tap to a board cell, clamped to the 3×3 grid.
 *
 * Page coordinates, never `locationX`/`locationY`: on the new architecture
 * those are relative to the touched *child* view — a tile — and not to the
 * responder. Both of the sibling app's games and its slider were bitten by that
 * on the SDK 54 upgrade (plan §10, docs/fungiku-plan.md §2).
 */
export function nsCellAt(
  px: number,
  py: number,
  originX: number,
  originY: number,
  pad: number,
  step: number
): { r: number; c: number } {
  const c = Math.max(0, Math.min(2, Math.floor((px - originX - pad) / step)));
  const r = Math.max(0, Math.min(2, Math.floor((py - originY - pad) / step)));
  return { r, c };
}

export function nsSeedCode(seed: number): string {
  return (seed >>> 0).toString(36).toUpperCase().padStart(5, '0');
}

export function nsParseCode(s: string): number | null {
  const seed = parseInt((s || '').trim(), 36);
  return isNaN(seed) ? null : seed >>> 0;
}
