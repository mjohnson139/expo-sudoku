/**
 * Fungiku's difficulty menu (docs/fungiku-plan.md §14.1).
 *
 * Pure data and pure functions — no React, no storage — so the mapping is
 * unit-testable and the UI has nothing to decide.
 *
 * **Difficulty is denominated in board size, and only board size, for now.**
 * That is a deliberate narrowing, not an oversight: `generate({size, seed})`
 * produces whatever it produces, there is no board rating, and the honest
 * measure for this genre (how deep the forced-deduction chain runs) leans on
 * `findForcedDeduction`, which §12.4 measured as shallow — 2 of 10 deductions
 * from an empty 10×10. Rating boards with it today would score nearly everything
 * expert.
 *
 * So the menu is built as a **seam**: everything above it speaks in
 * `difficulty`, and the only thing difficulty currently resolves to is a size.
 * Rated seeds can slot in behind `sizeForDifficulty` later with no UI change.
 */
import { SIZES } from './engine';

/**
 * The rungs, in order, with the shape the menu draws.
 *
 * `share` is **how many of the engine's sizes this rung claims**, walking `SIZES`
 * from the bottom — not a size list. That is the whole point: the sizes come out
 * of `SIZES` (derived from MIN_SIZE/MAX_SIZE in the engine), so the menu can
 * never offer a size `generate()` rejects, and a change to the engine's bounds
 * cannot leave a second hand-written list behind to drift (plan §14.1, §12).
 *
 * Shares of 2·1·2·1 over sizes 5-10 produce the plan's table:
 *
 *   | Easy | 5×5, 6×6 |  | Medium | 7×7 |  | Hard | 8×8, 9×9 |  | Expert | 10×10 |
 *
 * Labels and emoji match Sudoku's menu deliberately (`GameMenuModal`) — the
 * platform hosts several games and the basics should read the same in each.
 */
const RUNGS = [
  { id: 'easy', label: 'Easy', emoji: '😊', share: 2 },
  { id: 'medium', label: 'Medium', emoji: '😐', share: 1 },
  { id: 'hard', label: 'Hard', emoji: '😎', share: 2 },
  { id: 'expert', label: 'Expert', emoji: '😈', share: 1 },
];

/**
 * Hand out `SIZES` to the rungs by share, bottom up.
 *
 * Two guards, both about surviving a change to the engine's bounds rather than
 * about today's numbers:
 *   - the **top rung absorbs the remainder**, so a new largest size becomes
 *     expert rather than silently dropping out of the menu;
 *   - a rung that would come out **empty** (sizes got scarcer than the shares
 *     assume) falls back to the largest size there is, so every rung in the menu
 *     always starts a real board.
 */
const assignSizes = () => {
  const out = {};
  const top = SIZES[SIZES.length - 1];
  let cursor = 0;

  RUNGS.forEach((rung, index) => {
    const isTop = index === RUNGS.length - 1;
    const take = isTop ? Math.max(0, SIZES.length - cursor) : Math.min(rung.share, Math.max(0, SIZES.length - cursor));
    const sizes = SIZES.slice(cursor, cursor + take);
    cursor += take;
    out[rung.id] = sizes.length > 0 ? sizes : [top];
  });

  return out;
};

const SIZES_BY_DIFFICULTY = assignSizes();

/** The rungs the menu renders, in order: `{id, label, emoji, sizes}`. */
export const DIFFICULTIES = RUNGS.map(({ id, label, emoji }) => ({
  id,
  label,
  emoji,
  sizes: SIZES_BY_DIFFICULTY[id],
}));

/** Just the ids, in menu order. */
export const DIFFICULTY_IDS = DIFFICULTIES.map((rung) => rung.id);

/**
 * Where a player with nothing saved starts. The gentlest rung, matching how
 * Sudoku's menu reads top-down.
 */
export const DEFAULT_DIFFICULTY = DIFFICULTY_IDS[0];

/** Is this one of the menu's rungs? */
export const isDifficulty = (difficulty) => DIFFICULTY_IDS.includes(difficulty);

/** The sizes a difficulty can mean. Always a non-empty subset of `SIZES`. */
export const sizesForDifficulty = (difficulty) =>
  SIZES_BY_DIFFICULTY[isDifficulty(difficulty) ? difficulty : DEFAULT_DIFFICULTY];

/** Human label for a difficulty ("Easy"), for the hub badge and the board. */
export const difficultyLabel = (difficulty) => {
  const rung = DIFFICULTIES.find((entry) => entry.id === difficulty);
  return rung ? rung.label : '';
};

/**
 * Which size a `{difficulty, seed}` pair means.
 *
 * A rung spanning two sizes has to pick one per game, and it picks **from the
 * seed** so the pair is an identity: the same `{difficulty, seed}` is always the
 * same board, which is what makes a save restorable and a seed shareable
 * (plan §14.1).
 */
export const sizeForDifficulty = (difficulty, seed) => {
  const sizes = sizesForDifficulty(difficulty);
  if (sizes.length === 1) return sizes[0];

  const safeSeed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  return sizes[safeSeed % sizes.length];
};

/**
 * Which rung a raw size belongs to — the inverse of the table.
 *
 * Needed by the free-play size chips (a chip has to leave the state's difficulty
 * label coherent) and by the storage migration, which has a saved `size` and no
 * saved difficulty to read (plan §14.1).
 *
 * Note this is not a round trip: picking the 6×6 chip gives `easy`, but
 * `sizeForDifficulty('easy', seed)` may well resolve to 5. `size` stays the
 * authoritative fact about the board; difficulty is what the player picked it by.
 */
export const difficultyForSize = (size) => {
  const rung = DIFFICULTIES.find((entry) => entry.sizes.includes(size));
  return rung ? rung.id : DEFAULT_DIFFICULTY;
};

export default DIFFICULTIES;
