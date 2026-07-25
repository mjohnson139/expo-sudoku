/**
 * Deriving the hub's "Continue" affordance from a saved game.
 *
 * Kept free of React Native and AsyncStorage imports on purpose: this is the
 * part of the hub's progress logic worth unit-testing, and the test runner is a
 * plain node environment (see package.json's jest config).
 */

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

export default { describeSudokuProgress, formatElapsed };
