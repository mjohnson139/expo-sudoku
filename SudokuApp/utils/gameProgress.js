/**
 * Deriving the hub's "Continue" affordance from a saved game.
 *
 * Kept free of React Native and AsyncStorage imports on purpose: this is the
 * part of the hub's progress logic worth unit-testing, and the test runner is a
 * plain node environment (see package.json's jest config).
 */
import { MARKS } from '../games/fungiku/engine';

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
 * Takes the raw saved blob (`{ size, seed, marks }`) rather than a rebuilt
 * state, so the hub never has to run the generator just to draw a badge.
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

  return {
    label: `${saved.size}×${saved.size}`,
    detail: `${placed} of ${saved.size} placed`,
  };
};

export default { describeSudokuProgress, describeFungikuProgress, formatElapsed };
