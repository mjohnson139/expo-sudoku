/**
 * Deriving the hub's "Continue" affordance from a saved game.
 *
 * Kept free of React Native and AsyncStorage imports on purpose: this is the
 * part of the hub's progress logic worth unit-testing, and the test runner is a
 * plain node environment (see package.json's jest config).
 */
import { MARKS } from '../games/fungiku/engine';
import { difficultyForSize, difficultyLabel } from '../games/fungiku/difficulty';
import { describeScramble } from '../games/cube/scramble';

const TOTAL_SUDOKU_CELLS = 81;

/** Format a second count as mm:ss (hours roll into the minutes field). */
export const formatElapsed = (seconds) => {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const m = Math.floor(safe / 60).toString().padStart(2, '0');
  const s = (safe % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const titleCase = (word) =>
  typeof word === 'string' && word.length > 0
    ? word.charAt(0).toUpperCase() + word.slice(1)
    : '';

/**
 * Summarize a saved Sudoku state for a hub card.
 *
 * @param {Object|null} saved - a state object as returned by `loadState()`
 * @returns {{label: string, detail: string}|null} null when there is nothing to
 *   continue: no save, no game started, or a game that was already completed.
 */
export const describeSudokuProgress = (saved) => {
  if (!saved || !saved.gameStarted || saved.gameCompleted) {
    return null;
  }

  const difficulty = titleCase(saved.difficulty);
  const filled = Number.isFinite(saved.filledCount) ? saved.filledCount : 0;
  const remaining = Math.max(0, TOTAL_SUDOKU_CELLS - filled);

  return {
    label: [difficulty, formatElapsed(saved.elapsedSeconds)].filter(Boolean).join(' · '),
    detail: `${remaining} left`,
  };
};

/**
 * Summarize a saved Fungiku board for a hub card.
 *
 * Takes the raw saved blob (`{ difficulty, size, seed, marks }`) rather than a
 * rebuilt state, so the hub never has to run the generator just to draw a badge.
 * Callers pass it through `migrateFungikuSave` first, which is what guarantees
 * `difficulty` is there; the fallback below covers a blob that skipped that.
 *
 * The label **names the rung, not the size** (plan §14.1) — it is what the player
 * chose, and it is the same vocabulary Sudoku's badge uses one card away. The
 * size is still visible, in the detail line's total.
 *
 * @param {Object|null} saved
 * @returns {{label: string, detail: string}|null} null when the board is
 *   untouched — an empty grid is not something to continue.
 */
export const describeFungikuProgress = (saved) => {
  if (!saved || !Number.isFinite(saved.size) || !Array.isArray(saved.marks)) {
    return null;
  }

  const touched = saved.marks.some((mark) => mark && mark !== MARKS.EMPTY);
  if (!touched) return null;

  const placed = saved.marks.filter((mark) => mark === MARKS.MUSHROOM).length;
  const label = difficultyLabel(saved.difficulty) || difficultyLabel(difficultyForSize(saved.size));

  return {
    label,
    detail: `${placed} of ${saved.size} placed`,
  };
};

/**
 * Summarize the saved cube scramble for a hub card.
 *
 * "Continue" used to mean something slightly different here than it does for a
 * puzzle: there was no progress to lose, only a scramble the player was looking
 * at, so the badge counted the favorites. **Step 4 changed what there is to come
 * back to** — solves are kept now (plan §7.1), and a solve half-written against
 * the scramble on the cube is unambiguously the thing the hub should be pointing
 * at. So the solves for *this* scramble win when there are any, and the
 * favorites count is what the card falls back to.
 *
 * This is the second of the two functions outside `games/cube/` that the cube
 * owns, and it is here for the reason the file's header gives: no React Native,
 * no AsyncStorage, so the hub's rules can be tested.
 *
 * @param {{scramble: string, favorites: Array, solves: Array}|null} saved as
 *   returned by `games/cube/storage.js`'s `readCubeSave`
 * @returns {{label: string, detail: string}|null}
 */
export const describeCubeProgress = (saved) => {
  if (!saved || typeof saved.scramble !== 'string' || saved.scramble.length === 0) {
    return null;
  }

  const solveCount = Array.isArray(saved.solves)
    ? saved.solves.filter((solve) => solve && solve.scramble === saved.scramble).length
    : 0;
  if (solveCount > 0) {
    return {
      label: describeScramble(saved.scramble),
      detail: `${solveCount} solve${solveCount === 1 ? '' : 's'}`,
    };
  }

  const savedCount = Array.isArray(saved.favorites) ? saved.favorites.length : 0;

  return {
    label: describeScramble(saved.scramble),
    detail:
      savedCount > 0
        ? `${savedCount} favorite${savedCount === 1 ? '' : 's'}`
        : 'tap to inspect',
  };
};

export default {
  describeSudokuProgress,
  describeFungikuProgress,
  describeCubeProgress,
  formatElapsed,
};
