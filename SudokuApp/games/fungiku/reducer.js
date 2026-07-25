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
  findForcedDeduction,
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

  // Feedback and hints (plan §11).
  TOGGLE_MISTAKES: 'FUNGIKU_TOGGLE_MISTAKES',
  REQUEST_HINT: 'FUNGIKU_REQUEST_HINT',
  REVEAL_MUSHROOM: 'FUNGIKU_REVEAL_MUSHROOM',
  DISMISS_HINT: 'FUNGIKU_DISMISS_HINT',
};

/** What a hint turned out to be able to offer (plan §11.2). */
export const HINT_KINDS = {
  MISTAKE: 'mistake',
  NUDGE: 'nudge',
  REVEAL: 'reveal',
  STUCK: 'stuck',
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
export const buildPuzzleState = ({
  size = DEFAULT_SIZE,
  seed = DEFAULT_SEED,
  marks,
  showMistakes = false,
  hintsUsed = 0,
} = {}) => {
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
    // Opt-in correctness feedback (plan §11.1). Off by default: left on it turns
    // a deduction puzzle into trial-and-error. A preference, so it carries across
    // puzzles; §8 #7 asks whether it should default on for younger players.
    showMistakes: !!showMistakes,
    // Per-puzzle, so the ladder step can price hints later (plan §11.2).
    hintsUsed: Number.isFinite(hintsUsed) ? hintsUsed : 0,
    // Transient advice, never persisted: it goes stale the moment the board
    // changes, so every board-changing action clears it.
    hint: null,
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
  // Advice about a board you have since changed is worse than no advice.
  hint: null,
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

    case FUNGIKU_ACTIONS.TOGGLE_MISTAKES:
      return { ...state, showMistakes: !state.showMistakes };

    case FUNGIKU_ACTIONS.DISMISS_HINT:
      return state.hint ? { ...state, hint: null } : state;

    /**
     * One hint, as weak as will still help (plan §11.2). The cascade matters:
     *
     * 1. A wrong mushroom on the board corrupts every deduction that follows, so
     *    saying "row 3 is forced" would be confidently wrong. Mistakes first.
     * 2. Otherwise nudge: name the row, column or region where something is
     *    forced, *without* saying which cell. That is the hint that teaches.
     * 3. Nothing forced from here — **say so** rather than quietly revealing.
     *    The reveal is a second, deliberate tap.
     */
    case FUNGIKU_ACTIONS.REQUEST_HINT: {
      const mistakes = selectMistakes(state);
      if (mistakes.size > 0) {
        const cell = Math.min(...mistakes);
        return {
          ...state,
          hintsUsed: state.hintsUsed + 1,
          hint: {
            kind: HINT_KINDS.MISTAKE,
            cells: [cell],
            message:
              mistakes.size === 1
                ? 'This mushroom is in the wrong place.'
                : `${mistakes.size} of your mushrooms are in the wrong place — here is one.`,
          },
        };
      }

      const forced = findForcedDeduction(state.marks, state.regions, state.size);
      if (forced) {
        return {
          ...state,
          hintsUsed: state.hintsUsed + 1,
          hint: {
            kind: HINT_KINDS.NUDGE,
            // The whole row/column/region, deliberately — not `forced.cell`.
            cells: [...cellsOfGroup(forced, state.regions, state.size)],
            message: `${describeGroup(forced)} has only one cell left that can hold a mushroom.`,
          },
        };
      }

      // No forced step. Not counted as a hint used: it gave nothing away.
      return {
        ...state,
        hint: {
          kind: HINT_KINDS.STUCK,
          cells: [],
          offerReveal: true,
          message: 'No single forced step from here. Reveal a mushroom instead?',
        },
      };
    }

    /** The strongest rung: place one correct mushroom outright. */
    case FUNGIKU_ACTIONS.REVEAL_MUSHROOM: {
      const cell = selectRevealCell(state);
      if (cell < 0) return state;

      const marks = state.marks.slice();
      marks[cell] = MARKS.MUSHROOM;

      return {
        ...pushHistory(state, marks),
        hintsUsed: state.hintsUsed + 1,
        hint: {
          kind: HINT_KINDS.REVEAL,
          cells: [cell],
          message: 'One mushroom revealed.',
        },
      };
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
        hint: null,
      };
    }

    case FUNGIKU_ACTIONS.REDO: {
      if (state.redoStack.length === 0) return state;
      return {
        ...state,
        marks: state.redoStack[state.redoStack.length - 1],
        undoStack: [...state.undoStack, state.marks],
        redoStack: state.redoStack.slice(0, -1),
        hint: null,
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

/**
 * Mushrooms that break no rule *yet* but are not where the puzzle's single
 * solution has them (plan §11.1). Derived, never stored, so undo cannot leave a
 * stale flag behind.
 *
 * **Mushrooms only.** X marks are a thinking aid with no bearing on the win, so
 * there is no such thing as a wrong X — flagging one would be telling the player
 * how to think.
 *
 * Note what this can never report: because the puzzle has exactly one solution,
 * N mushrooms placed with no conflicts *is* that solution. There is no
 * complete-but-wrong board, so this is purely a mid-solve aid.
 */
export const selectMistakes = (state) => {
  const out = new Set();

  state.marks.forEach((mark, cell) => {
    if (mark !== MARKS.MUSHROOM) return;
    const row = Math.floor(cell / state.size);
    if (state.solution[row] !== cell % state.size) out.add(cell);
  });

  return out;
};

/**
 * Which cell a reveal would fill: a row still missing its mushroom whose solution
 * cell can be placed **without creating a conflict** (plan §11.2 — "a hint that
 * creates a conflict is worse than no hint").
 *
 * Returns -1 when there is nothing safe to reveal, which in practice means a
 * wrongly-placed mushroom is in the way. The hint cascade catches that first and
 * reports the mistake instead.
 */
export const selectRevealCell = (state) => {
  for (let row = 0; row < state.size; row++) {
    const cell = row * state.size + state.solution[row];
    if (state.marks[cell] === MARKS.MUSHROOM) continue;

    const trial = state.marks.slice();
    trial[cell] = MARKS.MUSHROOM;
    if (!findConflicts(trial, state.regions, state.size).has(cell)) return cell;
  }

  return -1;
};

/** Every cell of the row/column/region a nudge points at. */
const cellsOfGroup = ({ kind, index }, regions, size) => {
  if (kind === 'row') return Array.from({ length: size }, (_, col) => index * size + col);
  if (kind === 'column') return Array.from({ length: size }, (_, row) => row * size + index);

  const cells = [];
  regions.forEach((region, cell) => {
    if (region === index) cells.push(cell);
  });
  return cells;
};

/** How a nudge names the group it is pointing at, in the player's terms. */
const describeGroup = ({ kind, index }) => {
  if (kind === 'row') return `Row ${index + 1}`;
  if (kind === 'column') return `Column ${index + 1}`;
  // Regions have no number the player can see — the highlight does the pointing.
  return 'One color region';
};

export default fungikuReducer;
