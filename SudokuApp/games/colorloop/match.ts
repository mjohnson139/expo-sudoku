import { mulberry32 } from '../../utils/rng';
import { formatElapsed } from '../../utils/gameProgress';
import type { Mode } from './puzzle';

/**
 * Match gauntlets — three preset ladders of boards, all derived from one code.
 *
 * Arrives from the sibling app with one change: **the clock is formatted by
 * `utils/gameProgress.js`'s `formatElapsed` rather than by the sibling's own
 * `fmt`.** Plan §4.2 retires `utils/theme.ts` and folds its one surviving helper
 * into `formatElapsed`, so the two differ only in that this app pads the minutes
 * — `01:11` where the standalone app wrote `1:11`. That reaches the pasteable
 * result card below, and it is the right way round: a time reads the same on
 * every screen of this app, and the part of the card that has to be exact is the
 * **code**, which is what a rival pastes back in. The code grammar is untouched.
 */

export type PresetId = 'sprint' | 'classic' | 'marathon';

export interface MatchBoard {
  n: number;
  mode: Mode;
}

export interface MatchPreset {
  id: PresetId;
  letter: string;   // second character of the match code
  name: string;
  tagline: string;
  boards: MatchBoard[];
}

export interface MatchSplit {
  secs: number;
  moves: number;
}

export const PRESETS: MatchPreset[] = [
  {
    id: 'sprint',
    letter: 'S',
    name: 'Sprint',
    tagline: 'Three quick 3×3 boards',
    boards: [
      { n: 3, mode: 'rows' },
      { n: 3, mode: 'rows' },
      { n: 3, mode: 'rows' },
    ],
  },
  {
    id: 'classic',
    letter: 'C',
    name: 'Classic',
    tagline: 'Three boards, rising size',
    boards: [
      { n: 3, mode: 'rows' },
      { n: 4, mode: 'rows' },
      { n: 4, mode: 'ordered' },
    ],
  },
  {
    id: 'marathon',
    letter: 'M',
    name: 'Marathon',
    tagline: 'Five boards, every pattern',
    boards: [
      { n: 3, mode: 'rows' },
      { n: 4, mode: 'rows' },
      { n: 4, mode: 'ordered' },
      { n: 4, mode: 'diag' },
      { n: 5, mode: 'ordered' },
    ],
  },
];

export function presetById(id: PresetId): MatchPreset {
  return PRESETS.find(p => p.id === id)!;
}

/** Per-board seeds derived from the match seed — identical for everyone with the code. */
export function matchSeeds(seed: number, count: number): number[] {
  const rng = mulberry32(seed >>> 0);
  return Array.from({ length: count }, () => Math.floor(rng() * 0x7fffffff));
}

export function encodeMatchCode(preset: PresetId, seed: number): string {
  return 'M' + presetById(preset).letter + '-' + (seed >>> 0).toString(36).toUpperCase();
}

/** Match codes are `M<preset letter>-<seed36>`; single-board codes start with a digit. */
export function parseMatchCode(s: string): { preset: MatchPreset; seed: number } | null {
  const t = (s || '').trim().toUpperCase();
  const m = t.match(/^M([A-Z])-([0-9A-Z]+)$/);
  if (!m) return null;
  const preset = PRESETS.find(p => p.letter === m[1]);
  if (!preset) return null;
  const seed = parseInt(m[2], 36);
  if (isNaN(seed)) return null;
  return { preset, seed };
}

export function totalSecs(splits: MatchSplit[]): number {
  return splits.reduce((a, s) => a + s.secs, 0);
}

export function totalMoves(splits: MatchSplit[]): number {
  return splits.reduce((a, s) => a + s.moves, 0);
}

/** Pasteable result card — the code inside is the invitation. */
export function formatMatchResult(code: string, splits: MatchSplit[], name: string): string {
  const line = splits.map(s => formatElapsed(s.secs)).join(' · ');
  const who = name ? ' · ' + name : '';
  return (
    `COLOR LOOP · MATCH ${code}\n` +
    `${line} → ${formatElapsed(totalSecs(splits))} · ${totalMoves(splits)} moves${who}\n` +
    `Beat me — play code ${code}`
  );
}
