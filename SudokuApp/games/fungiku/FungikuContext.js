import React, { createContext, useCallback, useContext, useMemo } from 'react';
import usePersistentReducer from '../../hooks/usePersistentReducer';
import { MARKS, MIN_SIZE } from './engine';
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

/** Board sizes offered today. The real ladder arrives in a later step. */
export const SIZES = [5, 6, 7, 8];

// Stable object identity, so the persistence hook never sees a "new" adapter.
const FUNGIKU_PERSISTENCE = { load: loadFungikuState, save: saveFungikuState };

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

  /**
   * Start a puzzle. Generation happens here rather than in the reducer so a
   * failure surfaces as a caught error instead of a throw mid-dispatch.
   */
  const startPuzzle = useCallback(
    ({ size = state.size, seed = state.seed }) => {
      try {
        dispatch({
          type: FUNGIKU_ACTIONS.NEW_PUZZLE,
          // The feedback switch is a preference and carries over; the hint count
          // is per-puzzle and resets.
          payload: buildPuzzleState({ size, seed, showMistakes: state.showMistakes }),
        });
      } catch (error) {
        console.error('Fungiku generation failed:', error);
      }
    },
    [dispatch, state.size, state.seed, state.showMistakes]
  );

  const nextPuzzle = useCallback(
    () => startPuzzle({ size: state.size, seed: state.seed + 1 }),
    [startPuzzle, state.size, state.seed]
  );

  const changeSize = useCallback(
    (size) => startPuzzle({ size, seed: DEFAULT_SEED }),
    [startPuzzle]
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
      changeSize,
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
      changeSize,
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
