import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentReducer from '../../hooks/usePersistentReducer';
import { MARKS, MAX_SIZE, MIN_SIZE } from './engine';
import { loadFungikuState, saveFungikuState } from './storage';
import {
  DEFAULT_SEED,
  FUNGIKU_ACTIONS,
  buildPuzzleState,
  createInitialFungikuState,
  fungikuReducer,
  selectCanRedo,
  selectCanUndo,
  selectConflicts,
  selectIsSolved,
  selectMistakes,
  selectMushroomCount,
  selectRevealCell,
  selectRuleOutCells,
  resolvePuzzleIdentity,
} from './reducer';

/**
 * Fungiku's own context — deliberately **not** an extension of Sudoku's
 * GameContext. The two games share no state, no storage key and no reducer;
 * they only share the persistence hook and the theme.
 *
 * Derived values (conflicts, the mushroom count, the win flag) are memoized
 * from `marks` here rather than kept in the reducer, so undo can never leave a
 * stale highlight behind.
 */
const FungikuContext = createContext();

/**
 * Board sizes offered today — every size the engine supports, derived there from
 * MIN_SIZE/MAX_SIZE rather than listed here, so a chip the UI offers and a size
 * `generate()` accepts cannot drift apart. The difficulty rungs map *into* this
 * range (see ./difficulty.js); the chips are the free-play escape hatch that
 * reaches a single size directly (plan §14.1).
 */
export { SIZES } from './engine';
export { DIFFICULTIES } from './difficulty';

// Stable object identity, so the persistence hook never sees a "new" adapter.
const FUNGIKU_PERSISTENCE = { load: loadFungikuState, save: saveFungikuState };

/**
 * At and above this size, generation is deferred by a frame so the "Generating…"
 * state can paint before the main thread is blocked (plan §12.1).
 *
 * Generation is synchronous and its cost is a cliff: on the machine that
 * measured it, 8×8 takes 5 ms, 9×9 51 ms and 10×10 **414 ms median, 789 ms
 * worst**. A phone's JS engine is slower again. Below the threshold the work is
 * over before a frame could have been drawn, and deferring would only add
 * latency; at and above it, a "New puzzle" tap that freezes for half a second
 * reads as a bug, so the player is told what is happening instead.
 */
const DEFER_GENERATION_AT_SIZE = 9;

export const FungikuProvider = ({ children }) => {
  // Generated once. `useReducer` ignores this argument after mount, but
  // evaluating it inline would re-run `generate()` on every render — and this
  // provider re-renders on every tap, which at 8×8 is ~30ms of wasted work per
  // tap. (Generation is deterministic, so recomputing would be harmless if the
  // memo were ever dropped; it is purely a cost question.)
  const initialState = useMemo(() => createInitialFungikuState(), []);

  const [state, dispatch, hydrated] = usePersistentReducer(
    fungikuReducer,
    initialState,
    FUNGIKU_ACTIONS.RESTORE_SAVED_GAME,
    FUNGIKU_PERSISTENCE
  );

  const conflicts = useMemo(() => selectConflicts(state), [state.marks, state.regions, state.size]);
  const mushroomCount = useMemo(() => selectMushroomCount(state), [state.marks]);
  const solved = useMemo(() => selectIsSolved(state), [state.marks, state.regions, state.size]);

  // Any mark at all, not just mushrooms — a board restored with only X marks on
  // it still has something to clear, even though its undo stack is empty.
  const hasMarks = useMemo(
    () => state.marks.some((mark) => mark !== MARKS.EMPTY),
    [state.marks]
  );

  // How many cells one tap of "Rule out" would fill. Drives whether the button
  // is enabled, so it never sits there offering to do nothing.
  const ruleOutCount = useMemo(
    () => selectRuleOutCells(state).size,
    [state.marks, state.regions, state.size]
  );

  // Correctness feedback (plan §11.1). Computed whether or not the switch is on:
  // the hint cascade needs to know about mistakes even when the player has not
  // asked to see them. Only the *rendering* is gated on `showMistakes`.
  const mistakes = useMemo(
    () => selectMistakes(state),
    [state.marks, state.solution, state.size]
  );
  const canReveal = useMemo(
    () => selectRevealCell(state) >= 0,
    [state.marks, state.regions, state.solution, state.size]
  );

  const cycleCell = useCallback(
    (cell) => dispatch({ type: FUNGIKU_ACTIONS.CYCLE_CELL, payload: { cell } }),
    [dispatch]
  );

  // --- drag-to-sweep (plan §2) ---------------------------------------------
  // A stroke is many paints across many frames but exactly one undoable action:
  // beginStroke arms the undo entry, the first effective paint spends it.
  const beginStroke = useCallback(
    () => dispatch({ type: FUNGIKU_ACTIONS.BEGIN_STROKE }),
    [dispatch]
  );
  const paintCells = useCallback(
    (cells, mode) => dispatch({ type: FUNGIKU_ACTIONS.PAINT_CELLS, payload: { cells, mode } }),
    [dispatch]
  );
  const endStroke = useCallback(() => dispatch({ type: FUNGIKU_ACTIONS.END_STROKE }), [dispatch]);

  /** One tap: mark everything the placed mushrooms forbid (plan §2). */
  const ruleOut = useCallback(() => dispatch({ type: FUNGIKU_ACTIONS.RULE_OUT }), [dispatch]);

  // --- feedback and hints (plan §11) ---------------------------------------
  const toggleMistakes = useCallback(
    () => dispatch({ type: FUNGIKU_ACTIONS.TOGGLE_MISTAKES }),
    [dispatch]
  );
  const requestHint = useCallback(
    () => dispatch({ type: FUNGIKU_ACTIONS.REQUEST_HINT }),
    [dispatch]
  );
  const revealMushroom = useCallback(
    () => dispatch({ type: FUNGIKU_ACTIONS.REVEAL_MUSHROOM }),
    [dispatch]
  );
  const dismissHint = useCallback(
    () => dispatch({ type: FUNGIKU_ACTIONS.DISMISS_HINT }),
    [dispatch]
  );

  // --- starting a puzzle, and the hitch at the top size ---------------------
  //
  // True while a big board is being generated. It exists so the half-second the
  // main thread spends inside `generate()` at 10×10 is *announced* rather than
  // experienced as a frozen app (plan §12.1).
  const [generating, setGenerating] = useState(false);

  // Identifies the most recent request. A tap that arrives while an earlier
  // deferred generation is still pending invalidates it, so rapid taps on
  // "New puzzle" resolve to the last one asked for rather than racing.
  const requestId = useRef(0);
  useEffect(
    () => () => {
      // Unmounted (left for the hub): make any pending callback a no-op rather
      // than let it dispatch into a dead provider.
      requestId.current += 1;
    },
    []
  );

  /**
   * Start a puzzle. Generation happens here rather than in the reducer so a
   * failure surfaces as a caught error instead of a throw mid-dispatch.
   */
  const startPuzzle = useCallback(
    ({ difficulty = state.difficulty, size, seed = state.seed }) => {
      // Resolved here, before anything is dispatched, because whether this
      // generation has to be deferred depends on the size — and the difficulty
      // menu hands over a rung, not a size. Same rule the reducer uses, so the
      // size decided here is the size that gets built.
      const identity = resolvePuzzleIdentity({ difficulty, size, seed });

      const run = () => {
        try {
          dispatch({
            type: FUNGIKU_ACTIONS.NEW_PUZZLE,
            // The feedback switch is a preference and carries over; the hint
            // count is per-puzzle and resets.
            payload: buildPuzzleState({
              difficulty: identity.difficulty,
              size: identity.size,
              seed,
              showMistakes: state.showMistakes,
            }),
          });
        } catch (error) {
          console.error('Fungiku generation failed:', error);
        }
      };

      // Small boards: generate inline. The work finishes inside the same frame,
      // so deferring would add a frame of latency and buy nothing.
      if (identity.size < DEFER_GENERATION_AT_SIZE) {
        run();
        return;
      }

      const id = (requestId.current += 1);
      setGenerating(true);

      // Two hops on purpose. The state update above only *schedules* a render;
      // requestAnimationFrame runs after that render is committed, and the
      // timeout after the frame it belongs to has been handed off — so
      // "Generating…" is on screen before the main thread disappears into the
      // generator. A bare setTimeout(0) can run before the frame is drawn.
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (requestId.current !== id) return; // superseded, or unmounted
          try {
            run();
          } finally {
            setGenerating(false);
          }
        }, 0);
      });
    },
    [dispatch, state.difficulty, state.seed, state.showMistakes]
  );

  /**
   * Another board like this one. Keeps the *size* rather than re-resolving the
   * difficulty, so "New puzzle" on a 6×6 easy board never hands back a 5×5 —
   * a size change is something the player asks for, not a side effect of a
   * reroll.
   */
  const nextPuzzle = useCallback(
    () => startPuzzle({ difficulty: state.difficulty, size: state.size, seed: state.seed + 1 }),
    [startPuzzle, state.difficulty, state.size, state.seed]
  );

  /** The menu's primary path in (plan §14.1): a rung, and the seed picks the size. */
  const changeDifficulty = useCallback(
    (difficulty, seed = DEFAULT_SEED) => startPuzzle({ difficulty, seed }),
    [startPuzzle]
  );

  /** The free-play escape hatch: one exact size, whatever rung it belongs to. */
  const changeSize = useCallback(
    (size) => startPuzzle({ size, seed: DEFAULT_SEED }),
    [startPuzzle]
  );

  /**
   * Developer-only: jump straight to a `{difficulty, seed}` board so a reported
   * one can be reopened by hand. Keeps the current size when there is one, so
   * typing a seed does not also move you to another board size.
   */
  const changeSeed = useCallback(
    (seed) => startPuzzle({ difficulty: state.difficulty, size: state.size, seed }),
    [startPuzzle, state.difficulty, state.size]
  );

  const clearMarks = useCallback(() => dispatch({ type: FUNGIKU_ACTIONS.CLEAR_MARKS }), [dispatch]);
  const undo = useCallback(() => dispatch({ type: FUNGIKU_ACTIONS.UNDO }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: FUNGIKU_ACTIONS.REDO }), [dispatch]);

  const value = useMemo(
    () => ({
      ...state,
      conflicts,
      mushroomCount,
      solved,
      hasMarks,
      canUndo: selectCanUndo(state),
      canRedo: selectCanRedo(state),
      minSize: MIN_SIZE,
      maxSize: MAX_SIZE,
      generating,
      cycleCell,
      beginStroke,
      paintCells,
      endStroke,
      ruleOut,
      ruleOutCount,
      mistakes,
      canReveal,
      toggleMistakes,
      requestHint,
      revealMushroom,
      dismissHint,
      startPuzzle,
      nextPuzzle,
      changeDifficulty,
      changeSize,
      changeSeed,
      clearMarks,
      undo,
      redo,
    }),
    [
      state,
      conflicts,
      mushroomCount,
      solved,
      hasMarks,
      generating,
      cycleCell,
      beginStroke,
      paintCells,
      endStroke,
      ruleOut,
      ruleOutCount,
      mistakes,
      canReveal,
      toggleMistakes,
      requestHint,
      revealMushroom,
      dismissHint,
      startPuzzle,
      nextPuzzle,
      changeDifficulty,
      changeSize,
      changeSeed,
      clearMarks,
      undo,
      redo,
    ]
  );

  // Wait for hydration so a saved board never flashes as an empty one.
  return (
    <FungikuContext.Provider value={value}>{hydrated ? children : null}</FungikuContext.Provider>
  );
};

export const useFungikuContext = () => {
  const context = useContext(FungikuContext);
  if (context === undefined) {
    throw new Error('useFungikuContext must be used within a FungikuProvider');
  }
  return context;
};

export default FungikuContext;
