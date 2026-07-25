/**
 * Fungiku engine — the pure-logic core of the mushroom placement puzzle
 * (docs/fungiku-plan.md §1, §4). No React, no React Native, no side effects:
 * everything here is deterministic from a seed and unit-testable in isolation.
 *
 * The puzzle (Queens / Star-Battle genre): an N×N grid is partitioned into N
 * contiguous color regions. Place N mushrooms so that there is exactly one per
 * row, one per column, one per region, and no two mushrooms touch — including
 * diagonally. Every generated puzzle has exactly one solution.
 *
 * Key simplification that drives this whole module (plan §1): one-per-row plus
 * one-per-column means a solution is a *column permutation* — `solution[r]` is
 * the column of the mushroom in row r. Two mushrooms can then only touch if
 * they are in adjacent rows, so the no-touching rule collapses to
 *
 *     |solution[r] - solution[r + 1]| >= 2
 *
 * which is O(1) to check instead of scanning eight neighbors per cell.
 */

// Marks a cell can hold. X is a player aid only and never affects win
// detection (plan §2, §9).
export const MARKS = { EMPTY: 'empty', X: 'x', MUSHROOM: 'mushroom' };

// Tap order: empty -> X -> mushroom -> empty (plan §2).
const MARK_CYCLE = [MARKS.EMPTY, MARKS.X, MARKS.MUSHROOM];

/** The next mark in the tap cycle. */
export function nextMark(mark) {
  const i = MARK_CYCLE.indexOf(mark);
  // Unknown/absent mark is treated as empty, so the first tap yields X.
  return MARK_CYCLE[((i < 0 ? 0 : i) + 1) % MARK_CYCLE.length];
}

/**
 * Smallest solvable board. N=4 is impossible: one mushroom per column with a
 * gap of >= 2 between adjacent rows has no arrangement (plan §9), so the ladder
 * starts at 5.
 */
export const MIN_SIZE = 5;

/**
 * mulberry32 — a tiny, fast, well-distributed seeded PRNG. Deterministic across
 * platforms, so a seed reproduces a puzzle exactly (plan §4) and a seed is
 * shareable.
 */
export function createRng(seed) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher-Yates using the seeded rng. */
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Find one valid mushroom placement for an empty (region-less) board:
 * a column permutation with |col[r] - col[r+1]| >= 2. Randomized backtracking,
 * so different seeds give different solutions. Returns null if none exists
 * (i.e. size < MIN_SIZE).
 */
function findPlacement(size, rng) {
  const solution = new Array(size).fill(-1);
  const usedCols = new Array(size).fill(false);

  const place = (row) => {
    if (row === size) return true;
    const cols = shuffle(
      Array.from({ length: size }, (_, c) => c),
      rng
    );
    for (const col of cols) {
      if (usedCols[col]) continue;
      // No-touching, reduced to the adjacent-row column gap (plan §1).
      if (row > 0 && Math.abs(col - solution[row - 1]) < 2) continue;
      solution[row] = col;
      usedCols[col] = true;
      if (place(row + 1)) return true;
      usedCols[col] = false;
      solution[row] = -1;
    }
    return false;
  };

  return place(0) ? solution : null;
}

const idx = (row, col, size) => row * size + col;

/** Orthogonal neighbors of a cell, as flat indices. */
function orthNeighbors(cell, size) {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const out = [];
  if (row > 0) out.push(cell - size);
  if (row < size - 1) out.push(cell + size);
  if (col > 0) out.push(cell - 1);
  if (col < size - 1) out.push(cell + 1);
  return out;
}

/**
 * Grow N contiguous regions from the N solution mushrooms via randomized
 * multi-source BFS (plan §4 step 3). Each region is seeded at its mushroom, so
 * every region ends up non-empty and contains exactly one solution mushroom —
 * which means the placement is always a valid solution of the puzzle we build.
 * Contiguity holds by construction: a cell only joins a region it touches.
 *
 * Returns a flat array of length size*size mapping cell index -> region id.
 */
function growRegions(size, solution, rng) {
  const total = size * size;
  const regions = new Array(total).fill(-1);

  // Each region's frontier of candidate cells to absorb next.
  const frontiers = solution.map((col, row) => {
    const seed = idx(row, col, size);
    regions[seed] = row; // region id == the row of its mushroom
    return orthNeighbors(seed, size);
  });

  let claimed = size;
  while (claimed < total) {
    let progressed = false;
    // Round-robin over regions in random order so no region is systematically
    // favored and shapes stay irregular.
    for (const region of shuffle(
      Array.from({ length: size }, (_, r) => r),
      rng
    )) {
      const frontier = frontiers[region];
      // Drop cells already claimed since this frontier was last touched.
      let pick = -1;
      while (frontier.length > 0) {
        const j = Math.floor(rng() * frontier.length);
        const cell = frontier[j];
        frontier.splice(j, 1);
        if (regions[cell] === -1) {
          pick = cell;
          break;
        }
      }
      if (pick === -1) continue;

      regions[pick] = region;
      claimed++;
      progressed = true;
      for (const n of orthNeighbors(pick, size)) {
        if (regions[n] === -1) frontier.push(n);
      }
      if (claimed === total) break;
    }
    // Safety: no region could expand but cells remain. Can't happen while the
    // grid is connected, but never spin forever if it somehow does.
    if (!progressed) break;
  }

  return regions;
}

/**
 * Solve a region layout, collecting up to `limit` solutions. Backtracks row by
 * row, pruning on column-used, region-used, and the adjacent-row gap (plan §4).
 * `limit = 2` is enough to answer "is this unique?" cheaply.
 *
 * @returns {number[][]} each entry is a solution as a column-per-row array
 */
export function findSolutions(regions, size, limit = 2) {
  const usedCols = new Array(size).fill(false);
  const usedRegions = new Array(size).fill(false);
  const current = new Array(size).fill(-1);
  const found = [];

  const walk = (row, previousCol) => {
    if (row === size) {
      found.push(current.slice());
      return;
    }
    for (let col = 0; col < size; col++) {
      if (usedCols[col]) continue;
      if (row > 0 && Math.abs(col - previousCol) < 2) continue;
      const region = regions[idx(row, col, size)];
      if (usedRegions[region]) continue;

      usedCols[col] = true;
      usedRegions[region] = true;
      current[row] = col;
      walk(row + 1, col);
      usedCols[col] = false;
      usedRegions[region] = false;
      current[row] = -1;

      if (found.length >= limit) return;
    }
  };

  walk(0, -99); // row 0 is unconstrained by the gap rule
  return found;
}

/** How many solutions a layout admits, capped at `limit` (plan §4). */
export function countSolutions(regions, size, limit = 2) {
  return findSolutions(regions, size, limit).length;
}

/**
 * Try to move `cell` into region `to`, keeping every invariant intact:
 * the donor region must stay contiguous (it always keeps its mushroom, because
 * callers never move a mushroom cell). Mutates `regions`; reverts and returns
 * false if the move would break contiguity.
 */
function tryMoveCell(regions, size, cell, to) {
  const from = regions[cell];
  if (from === to) return false;
  regions[cell] = to;
  if (regionIsContiguous(regions, size, from)) return true;
  regions[cell] = from;
  return false;
}

/**
 * Break one unwanted solution (plan §4 step 4).
 *
 * `alt` is a solution we don't want. It already satisfies the row, column and
 * no-touching rules — those depend only on cell positions, not on regions — so
 * the *only* way to invalidate it is to make two of its mushrooms share a
 * region. We do exactly that: move one of alt's cells into the region of
 * another of alt's cells.
 *
 * This is safe for the puzzle's real `solution` because we never move one of
 * its mushroom cells, so every region keeps exactly one solution mushroom and
 * `solution` remains valid by construction.
 *
 * Mutates `regions`; returns true if alt was broken.
 */
function breakSolution(regions, size, solution, alt, rng) {
  const solutionCells = new Set(solution.map((col, row) => idx(row, col, size)));
  const altCells = alt.map((col, row) => idx(row, col, size));
  const altRegions = new Set(altCells.map((cell) => regions[cell]));

  for (const cell of shuffle(altCells.slice(), rng)) {
    // Moving a real-solution mushroom would break one-per-region for `solution`.
    if (solutionCells.has(cell)) continue;

    // Neighboring regions that another alt mushroom already occupies: moving
    // here gives alt two mushrooms in one region, invalidating it.
    const targets = shuffle(
      orthNeighbors(cell, size)
        .map((n) => regions[n])
        .filter((r) => r !== regions[cell] && altRegions.has(r)),
      rng
    );

    for (const to of targets) {
      if (tryMoveCell(regions, size, cell, to)) return true;
    }
  }

  return false;
}

/**
 * Fallback nudge when no targeted break is available: move an arbitrary
 * non-mushroom boundary cell to a neighboring region. Mutates `regions`.
 */
function perturbRegions(regions, size, solution, rng) {
  const total = size * size;
  const mushroomCells = new Set(solution.map((col, row) => idx(row, col, size)));

  for (const cell of shuffle(
    Array.from({ length: total }, (_, i) => i),
    rng
  )) {
    if (mushroomCells.has(cell)) continue;

    const candidates = shuffle(
      orthNeighbors(cell, size)
        .map((n) => regions[n])
        .filter((r) => r !== regions[cell]),
      rng
    );
    for (const to of candidates) {
      if (tryMoveCell(regions, size, cell, to)) return true;
    }
  }

  return false;
}

/** Flood-fill check that every cell of `region` is orthogonally connected. */
function regionIsContiguous(regions, size, region) {
  const members = [];
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] === region) members.push(i);
  }
  if (members.length === 0) return false;

  const seen = new Set([members[0]]);
  const stack = [members[0]];
  while (stack.length > 0) {
    const cell = stack.pop();
    for (const n of orthNeighbors(cell, size)) {
      if (regions[n] === region && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === members.length;
}

// How hard to try nudging one layout to uniqueness before regenerating, and how
// many full regenerations to attempt (plan §9: never loop forever).
const PERTURB_BUDGET = 400;
const REGENERATE_BUDGET = 40;

/**
 * Generate a Fungiku puzzle.
 *
 * @param {object}  opts
 * @param {number}  opts.size - board size N (>= MIN_SIZE)
 * @param {number}  opts.seed - integer seed; same seed + size => same puzzle
 * @returns {{ size: number, seed: number, regions: number[], solution: number[] }}
 *   `regions` is a flat size*size array of region ids; `solution[r]` is the
 *   column of row r's mushroom.
 */
export function generate({ size, seed }) {
  if (!Number.isInteger(size) || size < MIN_SIZE) {
    throw new Error(`Fungiku board size must be an integer >= ${MIN_SIZE} (got ${size})`);
  }

  const rng = createRng(seed);

  for (let attempt = 0; attempt < REGENERATE_BUDGET; attempt++) {
    const solution = findPlacement(size, rng);
    if (!solution) continue;

    const regions = growRegions(size, solution, rng);

    // Drive toward a single solution. Every move below preserves `solution`
    // (its mushroom cells are never reassigned), so the puzzle we return always
    // has the placement we generated as its unique answer.
    for (let i = 0; i < PERTURB_BUDGET; i++) {
      const sols = findSolutions(regions, size, 2);
      if (sols.length === 1) {
        return { size, seed, regions, solution };
      }

      // Prefer surgically breaking a solution that isn't ours; fall back to a
      // blind nudge if no targeted move is possible.
      const alt = sols.find((s) => !s.every((col, row) => col === solution[row])) || sols[0];
      if (!breakSolution(regions, size, solution, alt, rng)) {
        if (!perturbRegions(regions, size, solution, rng)) break;
      }
    }
  }

  throw new Error(`Fungiku generation failed for size ${size}, seed ${seed}`);
}

/** Do two cells touch, including diagonally? */
function touches(aRow, aCol, bRow, bCol) {
  return Math.abs(aRow - bRow) <= 1 && Math.abs(aCol - bCol) <= 1;
}

/**
 * Find every mushroom involved in a rule violation (plan §2). Shared by the
 * engine and the reducer so the rules exist in exactly one place.
 *
 * @param {string[]} marks - flat size*size array of MARKS values
 * @returns {Set<number>} flat indices of conflicting mushrooms
 */
export function findConflicts(marks, regions, size) {
  const conflicts = new Set();
  const placed = [];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i] === MARKS.MUSHROOM) {
      placed.push({ cell: i, row: Math.floor(i / size), col: i % size, region: regions[i] });
    }
  }

  for (let a = 0; a < placed.length; a++) {
    for (let b = a + 1; b < placed.length; b++) {
      const p = placed[a];
      const q = placed[b];
      if (
        p.row === q.row ||
        p.col === q.col ||
        p.region === q.region ||
        touches(p.row, p.col, q.row, q.col)
      ) {
        conflicts.add(p.cell);
        conflicts.add(q.cell);
      }
    }
  }

  return conflicts;
}

/**
 * Won when exactly N mushrooms are placed with no conflicts. X marks are
 * ignored entirely (plan §9) — they are a thinking aid, never a requirement.
 */
export function isSolved(marks, regions, size) {
  let count = 0;
  for (let i = 0; i < marks.length; i++) {
    if (marks[i] === MARKS.MUSHROOM) count++;
  }
  if (count !== size) return false;
  return findConflicts(marks, regions, size).size === 0;
}

/** Count placed mushrooms — drives the `🍄 X/N` counter (plan §1). */
export function countMushrooms(marks) {
  let count = 0;
  for (let i = 0; i < marks.length; i++) {
    if (marks[i] === MARKS.MUSHROOM) count++;
  }
  return count;
}

/** A fresh, all-empty mark array for a board of this size. */
export function createEmptyMarks(size) {
  return new Array(size * size).fill(MARKS.EMPTY);
}

/**
 * Every cell a mushroom at `cell` rules out: its whole row, its whole column,
 * its whole color region, and the eight cells touching it (plan §1). `cell`
 * itself is not included.
 *
 * This lives in the engine because it is a restatement of the rules, and the
 * rules exist in exactly one place. It powers the optional auto-X assist
 * (plan §2), which is precisely "mark everything this placement forbids".
 *
 * @returns {Set<number>} flat indices
 */
export function cellsRuledOutBy(cell, regions, size) {
  const out = new Set();
  const row = Math.floor(cell / size);
  const col = cell % size;
  const region = regions[cell];

  for (let i = 0; i < size; i++) {
    out.add(idx(row, i, size)); // rule 1: one per row
    out.add(idx(i, col, size)); // rule 2: one per column
  }

  // rule 3: one per region
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] === region) out.add(i);
  }

  // rule 4: no two mushrooms touch, diagonals included
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r >= 0 && c >= 0 && r < size && c < size) out.add(idx(r, c, size));
    }
  }

  out.delete(cell);
  return out;
}
