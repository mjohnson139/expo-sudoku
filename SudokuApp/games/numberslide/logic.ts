import { mulberry32 } from '../../utils/rng';

/**
 * Number Slide's pure core — the sliding-tile classic at 3×3, 4×4 and 5×5.
 *
 * Ported from the sibling color-loop app (plan §2: the engines move nearly
 * untouched), at its `708d59a` — **not** the `e07eb82` the plan's inventory
 * pinned. The sizes landed upstream after the merge plan was written and are
 * the reason to re-check `main` before porting anything else (plan §2).
 *
 * Everything in here is arithmetic with no React and no React Native, which is
 * what lets the incoming cases run in this repo's plain node test environment
 * (plan §5) — the same rule `games/fungiku/geometry.js` and
 * `games/cube/geometry.js` already follow.
 *
 * ### The 3×3 scramble is frozen
 *
 * A board is a pure function of its seed, so the string `K7P2Q` *is* the puzzle
 * and every code anyone has shared decodes through here. `scrambleSteps` keeps
 * 3×3 at its historical 160 steps for exactly that reason, and
 * `__tests__/logic.test.ts` pins three known boards byte-for-byte. Bigger boards
 * are new, so they are free to scale — but they are frozen from now on too.
 */

export type NSBoard = number[][]; // 0 = the gap
export type NSDir = 'up' | 'down' | 'left' | 'right';

/** Board sizes the game offers, easiest first. */
export const NS_SIZES = [3, 4, 5] as const;
export type NSSize = (typeof NS_SIZES)[number];

export function nsSolvedBoard(size: number): NSBoard {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r * size + c + 1) % (size * size))
  );
}

export interface NSState {
  board: NSBoard;
  empty: { r: number; c: number };
}

function findEmpty(board: NSBoard): { r: number; c: number } {
  const n = board.length;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (board[r][c] === 0) return { r, c };
  throw new Error('no gap');
}

export function nsIsSolved(board: NSBoard): boolean {
  const n = board.length;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (board[r][c] !== (r * n + c + 1) % (n * n)) return false;
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
  const n = state.board.length;
  const { r, c } = state.empty;
  const target: Record<NSDir, [number, number]> = {
    up: [r + 1, c],
    down: [r - 1, c],
    left: [r, c + 1],
    right: [r, c - 1],
  };
  const [tr, tc] = target[dir];
  if (tr < 0 || tr > n - 1 || tc < 0 || tc > n - 1) return null;
  return nsSlideAt(state, tr, tc);
}

// 3×3 keeps its historical step count so every shared 3×3 code still
// scrambles to the exact same board (pinned by test); bigger boards scale up.
function scrambleSteps(size: number): number {
  return size === 3 ? 160 : size * size * 20;
}

/** Seeded scramble: a random gap walk that never undoes its previous step. */
export function nsShuffle(seed: number, size: number = 3): NSState {
  const rng = mulberry32(seed >>> 0);
  const board = nsSolvedBoard(size);
  let empty = findEmpty(board);
  let last: { r: number; c: number } | null = null;
  const steps = scrambleSteps(size);
  for (let i = 0; i < steps; i++) {
    const opts: [number, number][] = [];
    const { r, c } = empty;
    if (r > 0) opts.push([r - 1, c]);
    if (r < size - 1) opts.push([r + 1, c]);
    if (c > 0) opts.push([r, c - 1]);
    if (c < size - 1) opts.push([r, c + 1]);
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
    const t = board[size - 1][1];
    board[size - 1][1] = board[size - 1][0];
    board[size - 1][0] = t;
    empty = findEmpty(board);
  }
  return { board, empty };
}

/**
 * Resolve a page-coordinate tap to a board cell, clamped to the grid.
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
  step: number,
  size: number = 3
): { r: number; c: number } {
  const c = Math.max(0, Math.min(size - 1, Math.floor((px - originX - pad) / step)));
  const r = Math.max(0, Math.min(size - 1, Math.floor((py - originY - pad) / step)));
  return { r, c };
}

/**
 * 3×3 codes keep the legacy bare format so old shared codes still parse
 * (and old app versions can open codes shared from here); bigger boards
 * prefix the size, e.g. "4-0K3JZ".
 */
export function nsSeedCode(seed: number, size: number = 3): string {
  const s = (seed >>> 0).toString(36).toUpperCase().padStart(5, '0');
  return size === 3 ? s : `${size}-${s}`;
}

export function nsParseCode(s: string): { seed: number; size: NSSize } | null {
  const raw = (s || '').trim();
  const m = raw.match(/^(?:(\d)\s*-\s*)?([0-9a-zA-Z]+)$/);
  if (!m) return null;
  const size = m[1] ? Number(m[1]) : 3;
  if (!(NS_SIZES as readonly number[]).includes(size)) return null;
  const seed = parseInt(m[2], 36);
  return isNaN(seed) ? null : { seed: seed >>> 0, size: size as NSSize };
}
