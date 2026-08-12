import type { Grid, Mode } from './puzzle';
import { maxN } from './puzzle';
import { EMPTY_TRAINING, LEVELS, type TrainingProgress } from './levels';
import { type MatchSplit, parseMatchCode, totalMoves, totalSecs } from './match';
import { formatElapsed } from '../../utils/gameProgress';

/**
 * The shape of Color Loop's save, and how an untrusted blob becomes one.
 *
 * Pure — no AsyncStorage, no React Native — which is why it is a separate file
 * from `storage.ts`: the node test runner cannot import AsyncStorage, and the
 * rules worth testing are the ones about *shape*, not about the round trip.
 * `games/numberslide/saveShape.ts`, `games/fungiku/saveMigration.js` and
 * `games/cube/solveList.js` are all the same split (plan §5), and the incoming
 * `__tests__/storage.test.ts` passes against this file untouched.
 *
 * ### One versioned blob, not eleven loose keys
 *
 * The sibling app wrote eleven unprefixed keys (`colorLoopSize`,
 * `colorLoopBest`, `colorLoopFriction`, …). This writes one `@ColorLoop`,
 * matching `@SudokuGame` / `@FungikuGame` / `@CubeScramble` / `@NumberSlide`
 * (plan §4.4), with `_v` from the first commit — the cube's §7.2 lesson is that
 * a save reshaped twice costs more than one designed once.
 *
 * **No migration is written**, and that is worth saying out loud because caution
 * points the other way: AsyncStorage is scoped to the installed app, and a
 * standalone Color Loop install is `com.mjohnson139.colorloop`, a different app
 * whose storage this build can never see. A migration would be code that could
 * only ever be dead.
 *
 * ### And the board in flight, added in Step 3
 *
 * Step 2 persisted preferences and results and left the board itself lost on the
 * way to the hub. `ColorLoopBoard` below closes that (plan §4.6), and it is an
 * **addition to a shape designed for it** rather than a reshape: `_v` stays 1,
 * because nothing branches on it and nothing should have to — the reader reads
 * by shape, so a key that is absent and a key that is corrupt get the same
 * answer.
 *
 * The two readers in this file deliberately behave differently, and the split is
 * the point. `readColorLoopSave` **never returns null**: it restores
 * *preferences*, where a corrupt physics value should cost the player their
 * physics value and not their eighteen training stars. `readColorLoopBoard` is
 * **all-or-nothing**: it restores a *board*, and a half-valid grid is a puzzle
 * that renders happily and cannot be solved. A broken board therefore falls out
 * of the blob without taking the blob with it.
 */

/** 1 — the first shape. Step 3's board is an addition to it, not a new version. */
export const COLOR_LOOP_STORAGE_VERSION = 1;

/**
 * A free-play personal best, one per board shape.
 *
 * ### ⚠️ Number Slide has none of this, and that is deliberate on both sides
 *
 * Step 1 **deleted** the sibling app's `NSBest` — the operator's call, 2026-08-08:
 * a personal best on a game whose whole point is a shareable code is the wrong
 * scoreboard, because the board is the same board on everyone's phone. Step 2
 * then shipped Color Loop *with* a best, which looks exactly like the decision
 * having been missed. **It was raised on 2026-08-11, checked against Step 1's
 * diff, and kept** (plan §4.4).
 *
 * The distinction is what free play *is* in each game. Number Slide's is one
 * board shape at a time and its code carries the size, so every board is
 * directly comparable to everyone else's. Color Loop's is a settings space —
 * `bestKey(n, mode)` spans up to fifteen combinations — so *"my best 4×4
 * diagonal"* is a claim about a **category of puzzle**, which is what Sudoku's
 * per-difficulty badge already is one card away.
 *
 * Do not "reconcile" the two games here. If it should go, it goes as a decision
 * with a date on it, like the one that removed Number Slide's.
 */
export interface BestEntry {
  secs: number;
  name: string;
}

export interface MatchBestEntry {
  secs: number; // total across the match's boards
  moves: number;
  name: string;
}

export interface Physics {
  friction: number; // 0.70..0.97
  flick: number; // 0.12..0.60 (px/ms threshold)
  magnet: number; // 0..1
  twin: number; // 0..0.40 (fraction of a cell near a seam that grabs two lines)
}

export const DEFAULT_PHYSICS: Physics = {
  friction: 0.86,
  flick: 0.3,
  magnet: 0.55,
  twin: 0.1,
};

/** The bounds each physics value is clamped into, on the way in and out. */
export const PHYSICS_RANGE: Record<keyof Physics, { lo: number; hi: number }> = {
  friction: { lo: 0.7, hi: 0.97 },
  flick: { lo: 0.12, hi: 0.6 },
  magnet: { lo: 0, hi: 1 },
  twin: { lo: 0, hi: 0.4 },
};

/**
 * The two phases a stored board can be in.
 *
 * `won` is deliberately absent. A finished puzzle is not something to continue,
 * and a save left behind would give the hub card a badge that reopens a win
 * screen — so the screen writes null instead of a solved board, and this reader
 * refuses one that arrives anyway.
 */
export type SavedPhase = 'armed' | 'live';

/**
 * What the player was *doing*, not just which board they were on.
 *
 * A board on its own is not the whole of it: the same 4×4 grid is free play,
 * rung 9 of the ladder or the second leg of a Marathon, and a card that offers
 * `4×4 · 01:24` while reopening a match is a card that lied. So all three kinds
 * resume and the badge says which (plan §4.6).
 *
 * **A match stores three fields, not six**, because the rest is derivable: the
 * code yields the preset through `parseMatchCode` and the per-board seeds
 * through `matchSeeds`, both of which are pinned by `match.test.ts`. That is
 * what makes resuming a match cheap enough to be worth doing — the alternative
 * the handoff offered was not resuming them at all, on the grounds that a
 * half-restored match forgetting your first two splits is worse than one that
 * starts again. Nothing here is half: the splits are the record.
 */
export type SavedPlay =
  | { kind: 'free' }
  | { kind: 'level'; id: number }
  | { kind: 'match'; code: string; boardIdx: number; splits: MatchSplit[] };

/** A board in flight — everything needed to put the player back where they were. */
export interface ColorLoopBoard {
  /** Kept even though the grid is stored outright: the seed *is* the shareable code. */
  seed: number;
  n: number;
  mode: Mode;
  grid: Grid;
  moves: number;
  secs: number;
  phase: SavedPhase;
  ctx: SavedPlay;
}

export interface ColorLoopSave {
  n: number;
  mode: Mode;
  playerName: string;
  bestMap: Record<string, BestEntry>;
  physics: Physics;
  training: TrainingProgress;
  matchBest: Record<string, MatchBestEntry>;
  /** The board to come back to, or null when there is not a usable one. */
  board: ColorLoopBoard | null;
}

/** The save a first launch behaves as though it read. */
export function emptyColorLoopSave(): ColorLoopSave {
  return {
    n: 4,
    mode: 'rows',
    playerName: '',
    bestMap: {},
    physics: { ...DEFAULT_PHYSICS },
    training: { ...EMPTY_TRAINING, best: {} },
    matchBest: {},
    board: null,
  };
}

/**
 * How many cells of each colour an `n`×`n` board of this mode holds.
 *
 * **Derived from the same expression `makeScrambled` deals from**, rather than
 * written out, because the two must not be able to drift: `rows` and `ordered`
 * start as `grid[r][c] = r` and `diag` as `grid[r][c] = r + c`. Rotations only
 * permute cells, so the multiset is invariant under every legal move — which is
 * exactly what makes it worth checking.
 *
 * The counts are **not** "n of each". `diag` runs `0…2n−2` with triangular
 * counts (`1, 2, … n, … 2, 1`), so a 4×4 diagonal board holds one `0`, two `1`s,
 * three `2`s, four `3`s, three `4`s, two `5`s and one `6`. Writing "n of each"
 * would reject every valid diagonal board; skipping the check would restore
 * unsolvable ones.
 */
export function colorCounts(n: number, mode: Mode): number[] {
  const counts: number[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = mode === 'diag' ? r + c : r;
      counts[v] = (counts[v] ?? 0) + 1;
    }
  }
  return counts;
}

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** Rebuild a match's splits — a list of `{ secs, moves }`, or null if it is not one. */
function readSplits(raw: unknown): MatchSplit[] | null {
  if (!Array.isArray(raw)) return null;
  const out: MatchSplit[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null;
    const e = entry as { secs?: unknown; moves?: unknown };
    if (!isCount(e.secs) || !isCount(e.moves)) return null;
    out.push({ secs: e.secs, moves: e.moves });
  }
  return out;
}

/**
 * Rebuild what the player was doing, checking it against the board they were on.
 *
 * The cross-checks are what make this worth more than a type guard: a level's
 * size and goal are fixed by `LEVELS`, a match leg's by its preset, so a stored
 * board that disagrees is not the board that context describes.
 */
function readSavedPlay(raw: unknown, n: number, mode: Mode): SavedPlay | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { kind?: unknown; id?: unknown; code?: unknown; boardIdx?: unknown; splits?: unknown };

  if (r.kind === 'free') return { kind: 'free' };

  if (r.kind === 'level') {
    if (!Number.isInteger(r.id)) return null;
    const id = r.id as number;
    const def = LEVELS[id - 1];
    if (!def || def.id !== id) return null;
    if (def.n !== n || def.mode !== mode) return null;
    return { kind: 'level', id };
  }

  if (r.kind === 'match') {
    if (typeof r.code !== 'string') return null;
    const parsed = parseMatchCode(r.code);
    if (!parsed) return null;
    if (!Number.isInteger(r.boardIdx)) return null;
    const boardIdx = r.boardIdx as number;
    const leg = parsed.preset.boards[boardIdx];
    if (!leg || leg.n !== n || leg.mode !== mode) return null;
    const splits = readSplits(r.splits);
    // One finished split per leg already behind you — the two advance together
    // in `onSolved`, so a pair that disagrees is a record this cannot trust.
    if (!splits || splits.length !== boardIdx) return null;
    return { kind: 'match', code: r.code, boardIdx, splits };
  }

  return null;
}

/**
 * Validate a stored board by shape, returning null for anything that would not
 * play — the same all-or-nothing rule `games/numberslide/saveShape.ts` follows.
 *
 * **What does not transfer from that reader is the board check itself.** Number
 * Slide asks whether the flat board is a permutation of `0…n²−1`, because every
 * tile there is distinct. Color Loop's tiles repeat, by a multiset that depends
 * on the mode — see `colorCounts`.
 */
export function readColorLoopBoard(raw: unknown): ColorLoopBoard | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;

  const mode = b.mode;
  if (mode !== 'rows' && mode !== 'ordered' && mode !== 'diag') return null;

  // A size the mode cannot reach is a board the palette could never have drawn.
  if (!Number.isInteger(b.n)) return null;
  const n = b.n as number;
  if (n < 3 || n > maxN(mode)) return null;

  if (b.phase !== 'armed' && b.phase !== 'live') return null;
  if (!isCount(b.moves) || !isCount(b.secs)) return null;
  if (!Number.isFinite(b.seed)) return null;

  const grid = b.grid;
  if (!Array.isArray(grid) || grid.length !== n) return null;
  if (!grid.every((row) => Array.isArray(row) && row.length === n)) return null;
  const flat = (grid as Grid).flat();
  if (!flat.every((v) => Number.isInteger(v) && v >= 0)) return null;

  const expected = colorCounts(n, mode);
  const seen: number[] = [];
  for (const v of flat) seen[v] = (seen[v] ?? 0) + 1;
  if (seen.length !== expected.length) return null;
  if (expected.some((count, v) => seen[v] !== count)) return null;

  const ctx = readSavedPlay(b.ctx, n, mode);
  if (!ctx) return null;

  return {
    seed: (b.seed as number) >>> 0,
    n,
    mode,
    grid: (grid as Grid).map((row) => [...row]),
    moves: b.moves as number,
    secs: b.secs as number,
    phase: b.phase,
    ctx,
  };
}

/**
 * Summarize a saved board for the hub's Continue affordance.
 *
 * Lives here rather than in `utils/gameProgress.js` deliberately: the cube's
 * architecture review named that file's inverted dependency — a shared util
 * importing three games' internals — as its headline finding, and a fifth import
 * would be shipping the known bug again (plan §4.6). `formatElapsed` is the
 * genuinely shared part and is imported *from* there, which is the direction
 * that scales.
 *
 * **The label says which offer this is.** `Level 9` and `Sprint · 2/3` are
 * different propositions from `4×4 in order`, and the card has one line for all
 * three.
 *
 * @returns null when there is nothing to come back to — **an untouched board is
 *   not progress.** Every visit deals one, so a card offering to "continue" a
 *   board nobody has moved would say Continue permanently and mean nothing by
 *   it. `describeNumberSlideProgress` and `describeFungikuProgress` draw the same
 *   line at the same place. A match is the one case where an unmoved board still
 *   counts, because the legs already behind you are the progress.
 */
export function describeColorLoopProgress(
  board: ColorLoopBoard | null
): { label: string; detail: string } | null {
  if (!board) return null;

  const moveCount = (moves: number) => `${moves} move${moves === 1 ? '' : 's'}`;

  if (board.ctx.kind === 'match') {
    const { code, boardIdx, splits } = board.ctx;
    const preset = parseMatchCode(code)?.preset;
    if (!preset) return null;
    if (splits.length === 0 && board.moves <= 0) return null;
    // The clock and the moves are the whole run so far, not this leg's — the
    // run is what the player came back for.
    const secs = totalSecs(splits) + board.secs;
    const moves = totalMoves(splits) + board.moves;
    return {
      label: `${preset.name} · ${boardIdx + 1}/${preset.boards.length} · ${formatElapsed(secs)}`,
      detail: moveCount(moves),
    };
  }

  if (board.moves <= 0) return null;

  if (board.ctx.kind === 'level') {
    return {
      label: `Level ${board.ctx.id} · ${formatElapsed(board.secs)}`,
      detail: moveCount(board.moves),
    };
  }

  // Free play names the size *and* the goal, because free play here is a
  // fifteen-way settings space rather than one board shape (plan §4.4) — `4×4`
  // alone would not tell two half-finished boards apart.
  const goal = board.mode === 'ordered' ? ' in order' : board.mode === 'diag' ? ' diagonal' : '';
  return {
    label: `${board.n}×${board.n}${goal} · ${formatElapsed(board.secs)}`,
    detail: moveCount(board.moves),
  };
}

/** Which best time belongs to which board shape. */
export function bestKey(n: number, mode: Mode): string {
  return n + (mode === 'ordered' ? 'o' : mode === 'diag' ? 'd' : 'a');
}

/** Rebuild a TrainingProgress from untrusted JSON — bad shapes fall back cleanly. */
export function sanitizeTraining(raw: unknown): TrainingProgress {
  const out: TrainingProgress = { unlocked: 1, best: {} };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as { unlocked?: unknown; best?: unknown };
  if (typeof r.unlocked === 'number' && isFinite(r.unlocked)) {
    out.unlocked = Math.min(LEVELS.length, Math.max(1, Math.floor(r.unlocked)));
  }
  if (r.best && typeof r.best === 'object') {
    for (const [k, v] of Object.entries(r.best as Record<string, unknown>)) {
      const id = parseInt(k, 10);
      if (!(id >= 1 && id <= LEVELS.length) || !v || typeof v !== 'object') continue;
      const e = v as { secs?: unknown; moves?: unknown; stars?: unknown };
      if (typeof e.secs !== 'number' || !isFinite(e.secs) || e.secs < 0) continue;
      const moves =
        typeof e.moves === 'number' && isFinite(e.moves) && e.moves >= 0 ? Math.floor(e.moves) : 0;
      const stars = typeof e.stars === 'number' ? Math.min(3, Math.max(1, Math.floor(e.stars))) : 1;
      out.best[id] = { secs: Math.floor(e.secs), moves, stars };
    }
  }
  return out;
}

/** Rebuild the per-match-code best map from untrusted JSON. */
export function sanitizeMatchBest(raw: unknown): Record<string, MatchBestEntry> {
  const out: Record<string, MatchBestEntry> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [code, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const e = v as { secs?: unknown; moves?: unknown; name?: unknown };
    if (typeof e.secs !== 'number' || !isFinite(e.secs) || e.secs < 0) continue;
    const moves =
      typeof e.moves === 'number' && isFinite(e.moves) && e.moves >= 0 ? Math.floor(e.moves) : 0;
    out[code] = { secs: Math.floor(e.secs), moves, name: typeof e.name === 'string' ? e.name : '' };
  }
  return out;
}

/** Rebuild the free-play best map — one entry per board shape. */
export function sanitizeBestMap(raw: unknown): Record<string, BestEntry> {
  const out: Record<string, BestEntry> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const e = v as { secs?: unknown; name?: unknown };
    if (typeof e.secs !== 'number' || !isFinite(e.secs) || e.secs < 0) continue;
    out[key] = { secs: Math.floor(e.secs), name: typeof e.name === 'string' ? e.name : '' };
  }
  return out;
}

function clampNumber(raw: unknown, lo: number, hi: number, fallback: number): number {
  return typeof raw === 'number' && isFinite(raw) ? Math.min(hi, Math.max(lo, raw)) : fallback;
}

/** Rebuild the touch-feel settings, each value clamped to the range its slider offers. */
export function sanitizePhysics(raw: unknown): Physics {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const read = (key: keyof Physics) =>
    clampNumber(r[key], PHYSICS_RANGE[key].lo, PHYSICS_RANGE[key].hi, DEFAULT_PHYSICS[key]);
  return {
    friction: read('friction'),
    flick: read('flick'),
    magnet: read('magnet'),
    twin: read('twin'),
  };
}

/**
 * Rebuild the whole save from whatever was on disk.
 *
 * **Never returns null**, unlike Number Slide's reader, and the difference is
 * the point: that one restores a *board*, where a half-valid grid has to be
 * refused outright, while this one restores *preferences*, where a corrupt
 * physics value should cost the player their physics value and not their
 * eighteen training stars. Every field falls back independently.
 *
 * The board is the one field that *is* all-or-nothing, and it is reached through
 * its own reader rather than by weakening this one: a board that cannot be
 * trusted becomes `null` — a fresh deal — and takes nothing else with it.
 */
export function readColorLoopSave(raw: unknown): ColorLoopSave {
  const out = emptyColorLoopSave();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;

  const mode = r.mode;
  if (mode === 'rows' || mode === 'ordered' || mode === 'diag') out.mode = mode;

  const n = r.n;
  if (typeof n === 'number' && isFinite(n)) {
    out.n = Math.min(6, Math.max(3, Math.floor(n)));
  }
  // A diagonal board needs 2n−1 colours, so the size a mode allows depends on
  // the mode — and the two are stored separately, so an inconsistent pair is a
  // shape this has to handle rather than one it can assume away.
  if (out.n > maxN(out.mode)) out.n = maxN(out.mode);

  if (typeof r.playerName === 'string') out.playerName = r.playerName.slice(0, 12);
  out.bestMap = sanitizeBestMap(r.bestMap);
  out.physics = sanitizePhysics(r.physics);
  out.training = sanitizeTraining(r.training);
  out.matchBest = sanitizeMatchBest(r.matchBest);
  out.board = readColorLoopBoard(r.board);
  return out;
}
