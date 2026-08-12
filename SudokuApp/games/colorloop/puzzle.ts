import { mulberry32 } from '../../utils/rng';
import { COLORS } from './colors';

export type Grid = number[][];
export type Mode = 'rows' | 'ordered' | 'diag';

/** Largest board size a mode supports with the palette (diag needs 2n−1 colors). */
export function maxN(mode: Mode): number {
  return mode === 'diag' ? Math.floor((COLORS.length + 1) / 2) : 6;
}

/** Default scramble depth for an n×n board. */
export function defaultScramble(n: number): number {
  return n * n * 6 + 24;
}

function shiftRow(grid: Grid, r: number, dir: number, n: number): void {
  const row = grid[r];
  grid[r] = dir > 0
    ? [row[n - 1], ...row.slice(0, n - 1)]
    : [...row.slice(1), row[0]];
}

function shiftCol(grid: Grid, c: number, dir: number, n: number): void {
  const col = grid.map(row => row[c]);
  const nc = dir > 0
    ? [col[n - 1], ...col.slice(0, n - 1)]
    : [...col.slice(1), col[0]];
  for (let r = 0; r < n; r++) grid[r][c] = nc[r];
}

function uniformRows(grid: Grid, n: number): boolean {
  for (let r = 0; r < n; r++) {
    const v = grid[r][0];
    for (let c = 1; c < n; c++) if (grid[r][c] !== v) return false;
  }
  return true;
}

/** Every diagonal in one direction is a single value; `anti` checks the / direction. */
function diagsAll(at: (r: number, c: number) => number, n: number, anti: boolean): boolean {
  if (anti) {
    for (let d = 0; d <= 2 * n - 2; d++) {
      let v = -1;
      for (let r = 0; r < n; r++) {
        const c = d - r;
        if (c < 0 || c >= n) continue;
        const x = at(r, c);
        if (v < 0) v = x;
        else if (x !== v) return false;
      }
    }
  } else {
    for (let k = -(n - 1); k <= n - 1; k++) {
      let v = -1;
      for (let r = 0; r < n; r++) {
        const c = r - k;
        if (c < 0 || c >= n) continue;
        const x = at(r, c);
        if (v < 0) v = x;
        else if (x !== v) return false;
      }
    }
  }
  return true;
}

function uniformDiags(grid: Grid, n: number): boolean {
  const at = (r: number, c: number) => grid[r][c];
  return diagsAll(at, n, true) || diagsAll(at, n, false); // either \ or / counts
}

export function makeScrambled(seed: number, n: number, mode: Mode, scramble?: number): Grid {
  const diag = mode === 'diag';
  const grid: Grid = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => (diag ? r + c : r))
  );
  const rng = mulberry32((seed >>> 0) ^ Math.imul(n, 0x9e3779b1));
  const K = scramble ?? defaultScramble(n);
  for (let i = 0; i < K; i++) {
    const idx = Math.floor(rng() * n);
    const dir = rng() < 0.5 ? 1 : -1;
    if (rng() < 0.5) shiftRow(grid, idx, dir, n);
    else shiftCol(grid, idx, dir, n);
  }
  if (diag ? uniformDiags(grid, n) : uniformRows(grid, n)) shiftCol(grid, 0, 1, n);
  return grid;
}

export function parseCode(s: string): { n: number; seed: number; mode: Mode } | null {
  const t = (s || '').trim().toUpperCase();
  const m = t.match(/^([3-6])-([0-9A-Z]+?)(-O|-D)?$/);
  if (!m) return null;
  const seed = parseInt(m[2], 36);
  if (isNaN(seed)) return null;
  const mode: Mode = m[3] === '-O' ? 'ordered' : m[3] === '-D' ? 'diag' : 'rows';
  let n = parseInt(m[1], 10);
  if (n > maxN(mode)) n = maxN(mode);
  return { n, seed, mode };
}

export function encodeCode(n: number, seed: number, mode: Mode): string {
  const suffix = mode === 'ordered' ? '-O' : mode === 'diag' ? '-D' : '';
  return n + '-' + (seed >>> 0).toString(36).toUpperCase() + suffix;
}

/** Rotate a row or column by `cells` steps (any sign), returning a new grid. */
export function rotateLine(grid: Grid, axis: 'row' | 'col', index: number, cells: number): Grid {
  const n = grid.length;
  const eff = ((cells % n) + n) % n;
  if (eff === 0) return grid;
  const next = grid.map(row => [...row]);
  if (axis === 'row') {
    for (let c = 0; c < n; c++) next[index][(c + eff) % n] = grid[index][c];
  } else {
    for (let r = 0; r < n; r++) next[(r + eff) % n][index] = grid[r][index];
  }
  return next;
}

/** Minimal number of single-cell shifts a rotation of `cells` represents. */
export function effectiveMoves(cells: number, n: number): number {
  let m = ((cells % n) + n) % n;
  if (m > n / 2) m -= n;
  return Math.abs(m);
}

export function isSolved(grid: Grid, mode: Mode): boolean {
  const n = grid.length;
  if (mode === 'diag') return uniformDiags(grid, n);
  if (mode === 'ordered') {
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) if (grid[r][c] !== r) return false;
    return true;
  }
  for (let r = 0; r < n; r++) {
    const v = grid[r][0];
    for (let c = 1; c < n; c++) if (grid[r][c] !== v) return false;
  }
  return true;
}
