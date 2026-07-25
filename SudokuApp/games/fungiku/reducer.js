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
  cellsRuledOutBy,
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

  // Drag-to-sweep (plan §2). A stroke paints many cells over many frames but
  // must undo as one action, so the gesture opens a stroke, paints repeatedly,
  // and closes it.
  BEGIN_STROKE: 'FUNGIKU_BEGIN_STROKE',
  PAINT_CELLS: 'FUNGIKU_PAINT_CELLS',
  END_STROKE: 'FUNGIKU_END_STROKE',

  // "Rule out" — one tap marks every cell the mushrooms already on the board
  // forbid. An action the player asks for, not a mode that acts behind them.
  RULE_OUT: 'FUNGIKU_RULE_OUT',
};

/** What a drag stroke does to the cells it crosses. */
export const PAINT_MODES = { X: 'x', ERASE: 'erase' };

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
    // Transient: true between BEGIN_STROKE and the stroke's first effective
    // paint, which is the paint that records the single undo entry. Never
    // persisted (see ./storage.js).
    strokeOpen: false,
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

    case FUNGIKU_ACTIONS.RULE_OUT: {
      const ruled = selectRuleOutCells(state);
      if (ruled.size === 0) return state;

      const marks = state.marks.slice();
      ruled.forEach((cell) => {
        marks[cell] = MARKS.X;
      });

      // One undo entry for the whole sweep, same as a drag stroke. The marks it
      // places are *ordinary* X marks from here on: removing a mushroom later
      // leaves them behind, and undo is how you take the whole assist back.
      // Retracting them per-mushroom would need per-mark provenance, which is
      // ambiguous the moment two mushrooms rule out the same cell.
      return pushHistory(state, marks);
    }

    case FUNGIKU_ACTIONS.BEGIN_STROKE:
      // Nothing is painted yet; the first effective paint spends this flag on
      // the stroke's one undo entry.
      return state.strokeOpen ? state : { ...state, strokeOpen: true };

    case FUNGIKU_ACTIONS.END_STROKE:
      return state.strokeOpen ? { ...state, strokeOpen: false } : state;

    case FUNGIKU_ACTIONS.PAINT_CELLS: {
      const { cells, mode } = action.payload;
      if (!Array.isArray(cells) || cells.length === 0) return state;

      const target = mode === PAINT_MODES.ERASE ? MARKS.EMPTY : MARKS.X;

      let marks = null;
      cells.forEach((cell) => {
        if (!Number.isInteger(cell) || cell < 0 || cell >= state.marks.length) return;

        // A stroke never disturbs a mushroom (plan §2) — losing a deduced
        // placement to a stray swipe is the worst thing this gesture could do.
        const current = (marks || state.marks)[cell];
        if (current === MARKS.MUSHROOM || current === target) return;

        if (!marks) marks = state.marks.slice();
        marks[cell] = target;
      });

      // Nothing actually changed: leave the stroke open so the *next* cell it
      // reaches is the one that records the undo entry.
      if (!marks) return state;

      return state.strokeOpen
        ? { ...pushHistory(state, marks), strokeOpen: false }
        : { ...state, marks };
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

/**
 * Empty cells that the mushrooms already on the board forbid — what one tap of
 * "Rule out" fills in (plan §2).
 *
 * Only blanks: an existing X is already correct, and a mushroom is never
 * disturbed, not even a conflicting one (the player is mid-deduction and it is
 * theirs to move).
 */
export const selectRuleOutCells = (state) => {
  const out = new Set();

  state.marks.forEach((mark, cell) => {
    if (mark !== MARKS.MUSHROOM) return;
    cellsRuledOutBy(cell, state.regions, state.size).forEach((ruled) => {
      if (state.marks[ruled] === MARKS.EMPTY) out.add(ruled);
    });
  });

  return out;
};

export const selectCanUndo = (state) => state.undoStack.length > 0;
export const selectCanRedo = (state) => state.redoStack.length > 0;

export default fungikuReducer;
