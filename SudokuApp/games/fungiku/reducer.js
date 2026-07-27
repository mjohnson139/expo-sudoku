/**
 * Fungiku game state (docs/fungiku-plan.md §2).
 *
 * Pure JavaScript — no React, no React Native, no storage. The rules are not
 * here: every rule question is answered by `engine.js`, so there is exactly one
 * place a row/column/region/adjacency check exists.
 *
 * What lives in state: the puzzle identity (`difficulty` + `size` + `seed`), the
 * puzzle data rebuilt from it (`regions`, `solution`), the player's `marks`, and
 * what those marks have cost — `lives` and `mistakeCells`. The mushroom count
 * and the win condition are **derived** from `marks` by the selectors at the
 * bottom rather than stored: storing them would let undo rewind marks and leave
 * stale highlights behind.
 *
 * **The invariant this module maintains, since plan §14.3:** every mushroom on
 * the board is at a solution cell. A wrong one is converted to a red X the
 * instant it is placed, and marks arriving from an older save are put through the
 * same rule on the way in. A great deal follows from it — most visibly that two
 * mushrooms can no longer conflict, which is why there is no `selectConflicts`
 * any more. See the note above the selectors.
 *
 * Persisted: the identity, `marks`, `lives`, `mistakeCells` and `hintsUsed` (see
 * ./storage.js). Generation is deterministic, so regions and the solution are
 * rebuilt rather than stored.
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
} from './engine';
import {
  DEFAULT_DIFFICULTY,
  difficultyForSize,
  isDifficulty,
  sizeForDifficulty,
  sizesForDifficulty,
} from './difficulty';

export const FUNGIKU_ACTIONS = {
  NEW_PUZZLE: 'FUNGIKU_NEW_PUZZLE',

  // The two halves of the input model (plan §14.2), which replaced the
  // three-state tap cycle:
  //   TAP_CELL       — empty becomes X; anything filled becomes empty.
  //   PLACE_MUSHROOM — the second tap of a double-tap. An *attempt*: the reducer
  //                    judges it against the solution and it may cost a life.
  TAP_CELL: 'FUNGIKU_TAP_CELL',
  PLACE_MUSHROOM: 'FUNGIKU_PLACE_MUSHROOM',

  CLEAR_MARKS: 'FUNGIKU_CLEAR_MARKS',

  // Acknowledging the out-of-lives modal. The restart is deliberately *not*
  // automatic — see the note on PLACE_MUSHROOM.
  RESTART_BOARD: 'FUNGIKU_RESTART_BOARD',
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

  // Feedback and hints (plan §11, §14.3).
  REQUEST_HINT: 'FUNGIKU_REQUEST_HINT',
  REVEAL_MUSHROOM: 'FUNGIKU_REVEAL_MUSHROOM',
  DISMISS_HINT: 'FUNGIKU_DISMISS_HINT',
};

/**
 * What a hint turned out to be able to offer (plan §11.2).
 *
 * Rung 1 — "one of your mushrooms is in the wrong place" — is **gone**, not
 * unused: since §14.3 a wrong mushroom never survives placement, so there can
 * never be one on the board to point at.
 */
export const HINT_KINDS = {
  NUDGE: 'nudge',
  REVEAL: 'reveal',
  STUCK: 'stuck',
};

/**
 * Lives per board (plan §14.3). **Three at every size**, not scaled per
 * difficulty — the operator's answer. A bigger board is more work, not more
 * forgiving, and a per-size table would be a second difficulty concept sitting
 * next to `difficulty.js`.
 */
export const MAX_LIVES = 3;

/** What a drag stroke does to the cells it crosses. */
export const PAINT_MODES = { X: 'x', ERASE: 'erase' };

/**
 * The board the app boots on, before anything is picked or restored.
 *
 * Pinned to the smallest size rather than resolved from `DEFAULT_DIFFICULTY`,
 * because this one runs at mount on the main thread with no "Generating…" state
 * to hide behind — the cheapest board there is, is the right one. It is still a
 * legitimate *easy* board (easy spans 5-6), so the identity stays coherent.
 */
export const DEFAULT_SIZE = MIN_SIZE;
export const DEFAULT_SEED = 1;

/**
 * Resolve a puzzle identity, keeping `difficulty` and `size` consistent whichever
 * one the caller actually knows (plan §14.1).
 *
 * Two entry paths, and they resolve in opposite directions:
 *   - **the difficulty menu** knows a rung and not a size, so the size comes from
 *     `sizeForDifficulty(difficulty, seed)`;
 *   - **a free-play size chip, and a restored save**, know a size — that size is
 *     authoritative and the difficulty is the rung it belongs to.
 *
 * The second case is why a save is not rewritten on load: a v1 save of a 6×6
 * reopens as a 6×6 labelled *Easy*, not as whatever Easy would have generated.
 *
 * A size that was *given* is passed through even when the engine will reject it,
 * rather than being quietly rounded into range — `generate()` throwing is how a
 * caller with a bug (or a corrupt save) finds out. Only an **absent** size is
 * resolved from the difficulty.
 */
export const resolvePuzzleIdentity = ({ difficulty, size, seed }) => {
  if (size === undefined || size === null) {
    const rung = isDifficulty(difficulty) ? difficulty : DEFAULT_DIFFICULTY;
    return { difficulty: rung, size: sizeForDifficulty(rung, seed) };
  }

  // Keep the caller's rung when the size really is one of its sizes; otherwise
  // the size wins and names its own rung.
  const named = isDifficulty(difficulty) && sizesForDifficulty(difficulty).includes(size);
  return { difficulty: named ? difficulty : difficultyForSize(size), size };
};

/** Is this flat cell index where the solution has a mushroom? */
const isSolutionCell = (cell, solution, size) => solution[Math.floor(cell / size)] === cell % size;

/**
 * Keep only the mistake records whose X is still on the board.
 *
 * Undo, an erase stroke and a plain tap can all take a red X away, and a record
 * that outlives its mark would come back to haunt the *next* X the player puts
 * in that cell — showing it red for a mistake they have already taken back.
 *
 * Returns the array it was given when nothing changed, so a state update can be
 * skipped by identity the way the rest of this module does.
 */
const pruneMistakeCells = (cells, marks) => {
  const kept = cells.filter((cell) => marks[cell] === MARKS.X);
  return kept.length === cells.length ? cells : kept;
};

/**
 * The invariant this whole step rests on: **every mushroom on the board sits at
 * a solution cell** (plan §14.3). Placement enforces it going forward — a wrong
 * mushroom is converted to a red X the instant it is placed — and this enforces
 * it on the way *in*, for marks that arrive from somewhere else.
 *
 * Today that means one thing: a save written before this step (v1/v2), whose
 * board may hold mushrooms the player had guessed and not yet been told about.
 * The migration cannot do this — `saveMigration.js` is pure and deliberately
 * knows nothing about solutions — so it happens here, where the puzzle has just
 * been generated and the answer is in hand.
 *
 * **No lives are charged.** Those guesses were made under rules where they were
 * free, and billing for them retroactively on first launch after an update would
 * be indefensible. What they get is the feedback the new rules would have given:
 * the mushroom becomes an ordinary X, flagged red.
 *
 * Leaving them instead was the alternative, and it is worse: it would leave the
 * board in a state the rest of the game now assumes cannot exist (two mushrooms
 * that conflict), which is exactly how "unreachable" code turns out to be
 * reachable.
 */
const enforcePlacedMushroomsAreCorrect = (marks, mistakeCells, solution, size) => {
  const wrong = [];

  marks.forEach((mark, cell) => {
    if (mark === MARKS.MUSHROOM && !isSolutionCell(cell, solution, size)) wrong.push(cell);
  });

  if (wrong.length === 0) return { marks, mistakeCells };

  const next = marks.slice();
  wrong.forEach((cell) => {
    next[cell] = MARKS.X;
  });

  return { marks: next, mistakeCells: [...new Set([...mistakeCells, ...wrong])] };
};

/**
 * Build a fresh state for a puzzle identity. Calls `generate`, which throws for
 * an unsupported size — callers do this outside the reducer so a generation
 * failure never happens mid-dispatch.
 *
 * @param {{difficulty?: string, size?: number, seed?: number, marks?: string[],
 *   lives?: number, mistakeCells?: number[], hintsUsed?: number}} opts
 */
export const buildPuzzleState = ({
  difficulty,
  size,
  seed = DEFAULT_SEED,
  marks,
  lives = MAX_LIVES,
  mistakeCells,
  hintsUsed = 0,
} = {}) => {
  const identity = resolvePuzzleIdentity({ difficulty, size, seed });
  const puzzle = generate({ size: identity.size, seed });

  // A restored `marks` array is only trusted if it matches this board's shape.
  const restored =
    Array.isArray(marks) && marks.length === puzzle.size * puzzle.size
      ? marks.slice()
      : createEmptyMarks(puzzle.size);

  const checked = enforcePlacedMushroomsAreCorrect(
    restored,
    (Array.isArray(mistakeCells) ? mistakeCells : []).filter(
      (cell) => Number.isInteger(cell) && cell >= 0 && cell < restored.length
    ),
    puzzle.solution,
    puzzle.size
  );

  return {
    // What the player picked, and what it resolved to. Both are persisted: the
    // difficulty is what the hub's Continue badge names, the size is what the
    // board actually is.
    difficulty: identity.difficulty,
    size: puzzle.size,
    seed: puzzle.seed,
    regions: puzzle.regions,
    solution: puzzle.solution,
    marks: checked.marks,
    undoStack: [],
    redoStack: [],
    // Lives left on *this* board (plan §14.3). Per-puzzle, and persisted: leaving
    // for the hub and coming back must not refund a mistake.
    lives: Number.isFinite(lives) ? Math.max(0, Math.min(MAX_LIVES, lives)) : MAX_LIVES,
    // Cells holding an X that is there because a mushroom was placed on them and
    // was wrong — the red X of §14.3. It cannot be derived: an ordinary X sitting
    // on a solution cell is a perfectly legal thing for a player to mark, and
    // colouring *those* red would hand over the answer.
    mistakeCells: pruneMistakeCells(checked.mistakeCells, checked.marks),
    // Per-puzzle, so the wallet step can price hints later (plan §11.2, §14.4).
    hintsUsed: Number.isFinite(hintsUsed) ? hintsUsed : 0,
    // Transient advice, never persisted: it goes stale the moment the board
    // changes, so every board-changing action clears it.
    hint: null,
    // Transient: the wrong guess the player just made, so the board can shake
    // the cell and the counter row can say what it cost. Cleared by the next
    // thing the player does; never persisted.
    lastMistake: null,
    // Monotonic within a session, and deliberately **not** cleared alongside
    // `lastMistake`: it is what makes two wrong guesses in the same cell two
    // distinct events. A counter that reset with the transient would hand out
    // seq 1 twice, and an animation keyed on it would not re-fire the second
    // time. Never persisted — it means nothing across a reload.
    mistakeSeq: 0,
    // Transient: true between BEGIN_STROKE and the stroke's first effective
    // paint, which is the paint that records the single undo entry. Never
    // persisted (see ./storage.js).
    strokeOpen: false,
    // Transient: the cell whose undo entry a double-tap's second half is still
    // allowed to amend. See TAP_CELL / PLACE_MUSHROOM.
    upgradableCell: -1,
  };
};

export const createInitialFungikuState = () =>
  buildPuzzleState({
    difficulty: DEFAULT_DIFFICULTY,
    // Explicit, so booting never resolves a seed into a bigger board than it has
    // to generate synchronously at mount (see DEFAULT_SIZE).
    size: DEFAULT_SIZE,
    seed: DEFAULT_SEED,
  });

/**
 * Undo entries hold a whole `marks` snapshot rather than a per-cell delta.
 * A board is at most 8×8 = 64 short strings, so snapshots cost almost nothing,
 * and it means a single cell tap and a full "clear board" undo through exactly
 * the same code path. The stacks are deliberately not persisted.
 */
const pushHistory = (state, marks, extra) => ({
  ...state,
  marks,
  undoStack: [...state.undoStack, state.marks],
  redoStack: [],
  mistakeCells: pruneMistakeCells(state.mistakeCells, marks),
  // Advice about a board you have since changed is worse than no advice.
  hint: null,
  // Both transients belong to one gesture and do not survive the next action.
  lastMistake: null,
  upgradableCell: -1,
  ...extra,
});

/**
 * Rewrite the marks **without** adding an undo entry — the second half of a
 * double-tap, whose first half already pushed one (see PLACE_MUSHROOM).
 *
 * The one wrinkle: double-tapping a cell that already held a correct mushroom
 * clears it and puts it straight back, so the amended board is identical to the
 * snapshot the first tap pushed. Left alone that would leave an undo entry that
 * undoes nothing — one dead press of the Undo button. Dropping it here is
 * cheaper than explaining it later.
 */
const amendHistory = (state, marks, extra) => {
  const previous = state.undoStack[state.undoStack.length - 1];
  const unchanged = previous.length === marks.length && previous.every((m, i) => m === marks[i]);

  return {
    ...state,
    marks,
    undoStack: unchanged ? state.undoStack.slice(0, -1) : state.undoStack,
    mistakeCells: pruneMistakeCells(state.mistakeCells, marks),
    hint: null,
    lastMistake: null,
    upgradableCell: -1,
    ...extra,
  };
};

export function fungikuReducer(state, action) {
  switch (action.type) {
    case FUNGIKU_ACTIONS.NEW_PUZZLE:
    case FUNGIKU_ACTIONS.RESTORE_SAVED_GAME:
      // The payload is already a complete built state (see buildPuzzleState).
      return { ...state, ...action.payload };

    /**
     * A single tap (plan §14.2): an empty cell is ruled out, a filled one is
     * cleared — whichever mark filled it.
     *
     * Clearing on a filled cell is what keeps every state reachable now that the
     * cycle is gone, and it is the reason this action can be dispatched the
     * instant the finger lifts: it never has to wait to find out whether a second
     * tap is coming. The X — by far the most common mark in the game — is on
     * screen immediately, and the second tap *upgrades* the result instead.
     */
    case FUNGIKU_ACTIONS.TAP_CELL: {
      const { cell } = action.payload;
      if (!Number.isInteger(cell) || cell < 0 || cell >= state.marks.length) {
        return state;
      }

      const marks = state.marks.slice();
      marks[cell] = marks[cell] === MARKS.EMPTY ? MARKS.X : MARKS.EMPTY;

      // Arm the upgrade. If a second tap on this same cell arrives next, it
      // amends this entry rather than stacking a second one on top.
      return pushHistory(state, marks, { upgradableCell: cell });
    }

    /**
     * The second tap of a double-tap: commit a mushroom (plan §14.2, §14.3).
     *
     * Two things are load-bearing here.
     *
     * **It is one undo entry, not two.** The first tap has already pushed an
     * entry and left `upgradableCell` pointing at this cell, so this half writes
     * the marks *without* pushing again. Undo therefore lands on the board as it
     * was before the double-tap began — not on the intermediate X that the player
     * never asked for. It is the same trick BEGIN_STROKE/PAINT_CELLS uses to make
     * a whole drag one action; the difference is only that the entry here is
     * pushed by the first event rather than armed by it.
     *
     * **A wrong mushroom does not survive.** It is judged against the solution
     * immediately: right, and it stays; wrong, and it becomes a red X and costs a
     * life. That is what makes "every mushroom on the board is a solution cell"
     * an invariant rather than a hope — see `enforcePlacedMushroomsAreCorrect`.
     */
    case FUNGIKU_ACTIONS.PLACE_MUSHROOM: {
      const { cell } = action.payload;
      if (!Number.isInteger(cell) || cell < 0 || cell >= state.marks.length) {
        return state;
      }

      // Out of lives already: the board is waiting to be restarted and the
      // modal is over it. Nothing on the board should respond until it is.
      if (state.lives === 0) return state;

      const correct = isSolutionCell(cell, state.solution, state.size);
      const marks = state.marks.slice();
      marks[cell] = correct ? MARKS.MUSHROOM : MARKS.X;

      // Amending the first tap's entry, or standing alone? Standing alone is the
      // accessibility action's path, and any path where the taps did not pair up.
      const amends = state.upgradableCell === cell && state.undoStack.length > 0;
      const record = amends ? amendHistory : pushHistory;

      if (correct) return record(state, marks);

      // Wrong. The mark is a red X from here on: an *ordinary* X that happens to
      // be remembered as a mistake, so a later tap clears it like any other
      // (plan §14.3 ships it clearable and flags it for an on-device answer).
      const lives = Math.max(0, state.lives - 1);
      const seq = (state.mistakeSeq || 0) + 1;
      const spent = record(state, marks, {
        lives,
        mistakeSeq: seq,
        lastMistake: { cell, seq },
      });

      // **The board is not wiped here, even on the last life.** It ends up at
      // `lives === 0` holding the mark that killed it, and RESTART_BOARD does the
      // clearing once the player has acknowledged the modal.
      //
      // Wiping in the same breath as the third mistake was the first version,
      // and the operator's report on it was that the board simply emptied with
      // no idea what had happened. Losing is worth a beat: the fatal red ✕ stays
      // on screen, the hearts are visibly empty, and the restart is something
      // the player presses.
      //
      // `lives === 0` is therefore exactly "a restart is pending", which is what
      // the modal is driven by — and because `lives` is persisted, quitting to
      // the hub mid-modal and coming back lands back on it rather than stranding
      // a board with no lives and no way to start it over.
      return {
        ...spent,
        mistakeCells: spent.mistakeCells.includes(cell)
          ? spent.mistakeCells
          : [...spent.mistakeCells, cell],
      };
    }

    /**
     * Start the **same** board over: same seed, same regions, marks cleared,
     * lives back (plan §14.3). A fresh board would punish twice, taking away the
     * deduction the player has already done along with the lives.
     */
    case FUNGIKU_ACTIONS.RESTART_BOARD:
      return {
        ...state,
        marks: createEmptyMarks(state.size),
        mistakeCells: [],
        lives: MAX_LIVES,
        undoStack: [],
        redoStack: [],
        hint: null,
        lastMistake: null,
        upgradableCell: -1,
      };

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

    case FUNGIKU_ACTIONS.DISMISS_HINT:
      return state.hint ? { ...state, hint: null } : state;

    /**
     * One hint, as weak as will still help (plan §11.2). The cascade matters:
     *
     * 1. Nudge: name the row, column or region where something is forced,
     *    *without* saying which cell. That is the hint that teaches.
     * 2. Nothing forced from here — **say so** rather than quietly revealing.
     *    The reveal is a second, deliberate tap.
     *
     * There used to be a rung above both of these — "one of your mushrooms is in
     * the wrong place" — and it is gone rather than dormant. Since §14.3 a wrong
     * mushroom is converted the instant it is placed, so there has never been one
     * on the board for that rung to find.
     */
    case FUNGIKU_ACTIONS.REQUEST_HINT: {
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
        : {
            ...state,
            marks,
            // A stroke can erase a red X like any other, so the record has to
            // follow the marks even on the paints that add no undo entry.
            mistakeCells: pruneMistakeCells(state.mistakeCells, marks),
          };
    }

    case FUNGIKU_ACTIONS.CLEAR_MARKS: {
      if (state.marks.every((mark) => mark === MARKS.EMPTY)) {
        return state;
      }
      return pushHistory(state, createEmptyMarks(state.size));
    }

    /**
     * Undo retracts the mark. It does **not** refund a life (plan §14.3) —
     * *"you don't get lives with info."* The wrong guess already told the player
     * something true about the board, and taking the mark back cannot take the
     * knowledge back, so the life stays spent. `lives` is simply not part of what
     * the history stacks hold: they are mark snapshots and nothing else.
     */
    case FUNGIKU_ACTIONS.UNDO: {
      if (state.undoStack.length === 0) return state;
      const marks = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        marks,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.marks],
        mistakeCells: pruneMistakeCells(state.mistakeCells, marks),
        hint: null,
        lastMistake: null,
        upgradableCell: -1,
      };
    }

    case FUNGIKU_ACTIONS.REDO: {
      if (state.redoStack.length === 0) return state;
      const marks = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        marks,
        undoStack: [...state.undoStack, state.marks],
        redoStack: state.redoStack.slice(0, -1),
        mistakeCells: pruneMistakeCells(state.mistakeCells, marks),
        hint: null,
        lastMistake: null,
        upgradableCell: -1,
      };
    }

    default:
      return state;
  }
}

// --- Selectors: everything derived, so nothing can go stale -----------------
//
// **There is no `selectConflicts` here any more, and that is a decision, not an
// omission** (plan §14.3, and see the module header). Every mushroom that
// survives on the board sits at a solution cell, and two solution cells never
// share a row, column or region and never touch — so two placed mushrooms cannot
// conflict. `findConflicts` stays in the engine, where generation, `isSolved`
// and the reveal-safety check below still need it; what is gone is the player-
// facing half that could no longer ever fire.
//
// `selectMistakes` went the same way, for the same reason: it reported wrong
// mushrooms *sitting on the board*, and none can. The red-X record that replaced
// it is `state.mistakeCells`, which is stored rather than derived — an ordinary X
// on a solution cell is a legal thing to mark, so "is this X a mistake?" is not a
// question the board can answer by looking at it.

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

/** Cells showing a red X: an X that is there because a mushroom went wrong. */
export const selectMistakeCells = (state) => new Set(state.mistakeCells);

/** Lives left, and the full complement — what the heart row draws. */
export const selectLives = (state) => ({ left: state.lives, of: MAX_LIVES });

/**
 * Which cell a reveal would fill: a row still missing its mushroom whose solution
 * cell can be placed **without creating a conflict** (plan §11.2 — "a hint that
 * creates a conflict is worse than no hint").
 *
 * The conflict trial is now belt and braces rather than a live guard: every
 * mushroom on the board is a solution cell, so another solution cell can never
 * clash with one. It is kept because it is what makes the guarantee *local* — the
 * check lives next to the placement it protects instead of depending on an
 * invariant established three files away.
 *
 * Returns -1 when every row already has its mushroom, i.e. the board is solved
 * and there is nothing left to reveal. Before §14.3 it could also mean "a wrongly
 * placed mushroom is in the way"; that case no longer exists.
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
