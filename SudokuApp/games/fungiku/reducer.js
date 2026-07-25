/**
 * Fungiku game state (docs/fungiku-plan.md §2).
 *
 * Pure JavaScript — no React, no React Native, no storage. The rules are not
 * here: every rule question is answered by `engine.js`, so there is exactly one
 * place a row/column/region/adjacency check exists.
 *
 * What lives in state: the puzzle identity (`size` + `seed`), the puzzle data
 * rebuilt from it (`regions`, `solution`), and the player's `marks`. Conflicts,
 * the mushroom count and the win condition are **derived** from `marks` by the
 * selectors at the bottom rather than stored — storing them would let undo
 * rewind marks and leave stale highlights behind.
 *
 * Only `size`, `seed` and `marks` are ever persisted (see ./storage.js);
 * generation is deterministic, so regions and the solution are rebuilt.
 */
import {
  MARKS,
  MIN_SIZE,
  createEmptyMarks,
  countMushrooms,
  findConflicts,
  generate,
  isSolved,
  nextMark,
} from './engine';

export const FUNGIKU_ACTIONS = {
  NEW_PUZZLE: 'FUNGIKU_NEW_PUZZLE',
  CYCLE_CELL: 'FUNGIKU_CYCLE_CELL',
  CLEAR_MARKS: 'FUNGIKU_CLEAR_MARKS',
  UNDO: 'FUNGIKU_UNDO',
  REDO: 'FUNGIKU_REDO',
  RESTORE_SAVED_GAME: 'FUNGIKU_RESTORE_SAVED_GAME',
};

export const DEFAULT_SIZE = MIN_SIZE;
export const DEFAULT_SEED = 1;

/**
 * Build a fresh state for a puzzle identity. Calls `generate`, which throws for
 * an unsupported size — callers do this outside the reducer so a generation
 * failure never happens mid-dispatch.
 *
 * @param {{size: number, seed: number, marks?: string[]}} opts
 */
export const buildPuzzleState = ({ size = DEFAULT_SIZE, seed = DEFAULT_SEED, marks } = {}) => {
  const puzzle = generate({ size, seed });

  return {
    size: puzzle.size,
    seed: puzzle.seed,
    regions: puzzle.regions,
    solution: puzzle.solution,
    // A restored `marks` array is only trusted if it matches this board's shape.
    marks:
      Array.isArray(marks) && marks.length === puzzle.size * puzzle.size
        ? marks.slice()
        : createEmptyMarks(puzzle.size),
    undoStack: [],
    redoStack: [],
  };
};

export const createInitialFungikuState = () => buildPuzzleState();

/**
 * Undo entries hold a whole `marks` snapshot rather than a per-cell delta.
 * A board is at most 8×8 = 64 short strings, so snapshots cost almost nothing,
 * and it means a single cell tap and a full "clear board" undo through exactly
 * the same code path. The stacks are deliberately not persisted.
 */
const pushHistory = (state, marks) => ({
  ...state,
  marks,
  undoStack: [...state.undoStack, state.marks],
  redoStack: [],
});

export function fungikuReducer(state, action) {
  switch (action.type) {
    case FUNGIKU_ACTIONS.NEW_PUZZLE:
    case FUNGIKU_ACTIONS.RESTORE_SAVED_GAME:
      // The payload is already a complete built state (see buildPuzzleState).
      return { ...state, ...action.payload };

    case FUNGIKU_ACTIONS.CYCLE_CELL: {
      const { cell } = action.payload;
      if (!Number.isInteger(cell) || cell < 0 || cell >= state.marks.length) {
        return state;
      }

      // A conflicting placement is allowed on purpose (plan §2): conflicts are
      // shown, never blocked — spotting and fixing them is the puzzle.
      const marks = state.marks.slice();
      marks[cell] = nextMark(marks[cell]);
      return pushHistory(state, marks);
    }

    case FUNGIKU_ACTIONS.CLEAR_MARKS: {
      if (state.marks.every((mark) => mark === MARKS.EMPTY)) {
        return state;
      }
      return pushHistory(state, createEmptyMarks(state.size));
    }

    case FUNGIKU_ACTIONS.UNDO: {
      if (state.undoStack.length === 0) return state;
      return {
        ...state,
        marks: state.undoStack[state.undoStack.length - 1],
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.marks],
      };
    }

    case FUNGIKU_ACTIONS.REDO: {
      if (state.redoStack.length === 0) return state;
      return {
        ...state,
        marks: state.redoStack[state.redoStack.length - 1],
        undoStack: [...state.undoStack, state.marks],
        redoStack: state.redoStack.slice(0, -1),
      };
    }

    default:
      return state;
  }
}

// --- Selectors: everything derived, so nothing can go stale -----------------

/** Flat indices of mushrooms breaking a rule (plan §2). */
export const selectConflicts = (state) => findConflicts(state.marks, state.regions, state.size);

/** Mushrooms placed — the left half of the `🍄 X/N` counter. */
export const selectMushroomCount = (state) => countMushrooms(state.marks);

/** Won when N mushrooms sit legally. X marks are ignored entirely (plan §9). */
export const selectIsSolved = (state) => isSolved(state.marks, state.regions, state.size);

export const selectCanUndo = (state) => state.undoStack.length > 0;
export const selectCanRedo = (state) => state.redoStack.length > 0;

export default fungikuReducer;
