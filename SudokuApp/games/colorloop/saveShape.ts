import type { Mode } from './puzzle';
import { maxN } from './puzzle';
import { EMPTY_TRAINING, LEVELS, type TrainingProgress } from './levels';

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
 * ### What is not here yet
 *
 * **The board in flight.** Step 2 persists preferences and results — size, mode,
 * name, bests, physics, training, match bests — and a Color Loop board is still
 * lost on the way to the hub. Making it resumable, and giving the card the
 * Continue badge that follows from it, is Step 3's whole job (plan §4.6);
 * `games/numberslide/{storage,saveShape}.ts` is the arrangement to copy,
 * including the flush on unmount *and* on backgrounding. The version number
 * exists so that step is an addition rather than a reshape.
 */

/** 1 — the first shape. */
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

export interface ColorLoopSave {
  n: number;
  mode: Mode;
  playerName: string;
  bestMap: Record<string, BestEntry>;
  physics: Physics;
  training: TrainingProgress;
  matchBest: Record<string, MatchBestEntry>;
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
  return out;
}
