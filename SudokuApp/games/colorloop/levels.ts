import { Mode, defaultScramble } from './puzzle';

export interface LevelDef {
  id: number;          // 1-based, contiguous
  n: number;
  mode: Mode;
  scramble: number;    // scramble depth — low depths are the tutorial
  seed: number;        // fixed, so every player trains on the same board
  hint?: string;       // one extra line on the armed cover
  stars: { two: number; three: number }; // secs thresholds; finishing = 1 star
}

export interface LevelBest {
  secs: number;
  moves: number;
  stars: number; // 1..3
}

export interface TrainingProgress {
  unlocked: number;                  // highest playable level id
  best: Record<number, LevelBest>;   // keyed by level id
}

export const EMPTY_TRAINING: TrainingProgress = { unlocked: 1, best: {} };

export const LEVELS: LevelDef[] = [
  { id: 1, n: 3, mode: 'rows', scramble: 2, seed: 1037, stars: { two: 10, three: 5 },
    hint: 'Drag a row — it wraps around the edge.' },
  { id: 2, n: 3, mode: 'rows', scramble: 4, seed: 1074, stars: { two: 15, three: 8 },
    hint: 'Columns slide the same way.' },
  { id: 3, n: 3, mode: 'rows', scramble: 8, seed: 1111, stars: { two: 25, three: 12 } },
  { id: 4, n: 3, mode: 'rows', scramble: defaultScramble(3), seed: 1148, stars: { two: 40, three: 20 } },
  { id: 5, n: 3, mode: 'ordered', scramble: 6, seed: 1185, stars: { two: 25, three: 12 },
    hint: 'Now match each row to the color key on the left.' },
  { id: 6, n: 3, mode: 'ordered', scramble: defaultScramble(3), seed: 1222, stars: { two: 45, three: 25 } },
  { id: 7, n: 4, mode: 'rows', scramble: 8, seed: 1259, stars: { two: 25, three: 12 },
    hint: 'Bigger board, same moves.' },
  { id: 8, n: 4, mode: 'rows', scramble: 20, seed: 1296, stars: { two: 45, three: 25 } },
  { id: 9, n: 4, mode: 'rows', scramble: defaultScramble(4), seed: 1333, stars: { two: 75, three: 40 } },
  { id: 10, n: 4, mode: 'ordered', scramble: 16, seed: 1370, stars: { two: 50, three: 25 } },
  { id: 11, n: 4, mode: 'ordered', scramble: defaultScramble(4), seed: 1407, stars: { two: 90, three: 50 } },
  { id: 12, n: 3, mode: 'diag', scramble: 6, seed: 1444, stars: { two: 35, three: 18 },
    hint: 'Each diagonal one color — either direction counts.' },
  { id: 13, n: 3, mode: 'diag', scramble: defaultScramble(3), seed: 1481, stars: { two: 60, three: 30 } },
  { id: 14, n: 4, mode: 'diag', scramble: 16, seed: 1518, stars: { two: 80, three: 45 } },
  { id: 15, n: 5, mode: 'rows', scramble: defaultScramble(5), seed: 1555, stars: { two: 110, three: 60 } },
  { id: 16, n: 5, mode: 'ordered', scramble: defaultScramble(5), seed: 1592, stars: { two: 140, three: 75 } },
  { id: 17, n: 4, mode: 'diag', scramble: defaultScramble(4), seed: 1629, stars: { two: 130, three: 70 } },
  { id: 18, n: 6, mode: 'ordered', scramble: defaultScramble(6), seed: 1666, stars: { two: 240, three: 130 } },
];

export function starsFor(level: LevelDef, secs: number): 1 | 2 | 3 {
  if (secs <= level.stars.three) return 3;
  if (secs <= level.stars.two) return 2;
  return 1;
}

export function isUnlocked(p: TrainingProgress, id: number): boolean {
  return id >= 1 && id <= p.unlocked;
}

/** Record a solve: unlock the next level, keep the best time (stars never regress). */
export function applyWin(p: TrainingProgress, id: number, secs: number, moves: number): TrainingProgress {
  const level = LEVELS[id - 1];
  if (!level) return p;
  const unlocked = Math.max(p.unlocked, Math.min(id + 1, LEVELS.length));
  const prev = p.best[id];
  if (prev && secs >= prev.secs) return { unlocked, best: p.best };
  const stars = Math.max(prev?.stars ?? 0, starsFor(level, secs));
  return { unlocked, best: { ...p.best, [id]: { secs, moves, stars } } };
}

export function totalStars(p: TrainingProgress): number {
  return Object.values(p.best).reduce((a, b) => a + b.stars, 0);
}
