import { formatElapsed } from '../../utils/gameProgress';
import { NS_SIZES, NSSize } from './logic';

/**
 * The shape of Number Slide's save, and what the hub says about it.
 *
 * Pure — no AsyncStorage, no React Native — which is why it is a separate file
 * from `storage.ts`. That is this repo's own convention, for this repo's own
 * reason: the node test runner cannot import AsyncStorage, and the rules worth
 * testing are the ones about *shape*, not about the round trip.
 * `games/fungiku/saveMigration.js` and `games/cube/solveList.js` are the same
 * split (plan §5).
 *
 * `describeNumberSlideProgress` lives here rather than in
 * `utils/gameProgress.js` deliberately: the cube's architecture review named
 * that file's inverted dependency — a shared util importing three games'
 * internals — as its headline finding, and a fourth import would be shipping the
 * known bug again (plan §4.6). `formatElapsed` is the genuinely shared part and
 * is imported *from* there, which is the direction that scales.
 */

/** 1 — the first shape. */
export const NUMBER_SLIDE_STORAGE_VERSION = 1;

export interface NSSave {
  size: NSSize;
  seed: number;
  board: number[][];
  empty: { r: number; c: number };
  moves: number;
  secs: number;
}

const isFiniteAtLeastZero = (v: unknown): v is number => Number.isFinite(v) && (v as number) >= 0;

/**
 * Validate a save by shape, returning null for anything that would not draw.
 *
 * **The board is checked against itself, not just against its type.** A grid of
 * the right dimensions whose values are not a permutation of `0…n²-1` is a
 * puzzle with two 7s and no 3 — unsolvable, and it would render perfectly
 * happily. A hand-edited file, a half-written record or a save from a future
 * version with a size this build does not know are all the same answer: deal a
 * fresh board rather than restore a broken one.
 */
export function readNumberSlideSave(raw: unknown): NSSave | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;

  const size = s.size;
  if (!(NS_SIZES as readonly unknown[]).includes(size)) return null;
  const n = size as NSSize;

  const board = s.board;
  if (!Array.isArray(board) || board.length !== n) return null;
  if (!board.every((row) => Array.isArray(row) && row.length === n)) return null;

  const flat = (board as number[][]).flat();
  if (!flat.every((v) => Number.isInteger(v))) return null;
  const sorted = [...flat].sort((a, b) => a - b);
  if (sorted.some((v, i) => v !== i)) return null;

  const empty = s.empty as { r?: unknown; c?: unknown } | undefined;
  if (!empty || !Number.isInteger(empty.r) || !Number.isInteger(empty.c)) return null;
  const { r, c } = empty as { r: number; c: number };
  if (r < 0 || r >= n || c < 0 || c >= n) return null;
  if ((board as number[][])[r][c] !== 0) return null;

  if (!isFiniteAtLeastZero(s.moves) || !isFiniteAtLeastZero(s.secs)) return null;
  if (!Number.isFinite(s.seed)) return null;

  return {
    size: n,
    seed: (s.seed as number) >>> 0,
    board: (board as number[][]).map((row) => [...row]),
    empty: { r, c },
    moves: Math.floor(s.moves as number),
    secs: Math.floor(s.secs as number),
  };
}

/**
 * Summarize a saved board for the hub's Continue affordance.
 *
 * @returns null when there is nothing to come back to — **an untouched board is
 *   not progress.** Every visit deals one, so a card that offered to "continue"
 *   a board nobody has moved would say Continue permanently and mean nothing by
 *   it. `describeFungikuProgress` draws the same line at the same place.
 */
export function describeNumberSlideProgress(
  save: NSSave | null
): { label: string; detail: string } | null {
  if (!save || save.moves <= 0) return null;

  return {
    // Size and clock, in the shape Sudoku's badge already uses one card away
    // (`Easy · 02:14`). The size is what the board *is*, and it is the only
    // thing that distinguishes two half-finished Number Slides.
    label: `${save.size}×${save.size} · ${formatElapsed(save.secs)}`,
    detail: `${save.moves} move${save.moves === 1 ? '' : 's'}`,
  };
}
