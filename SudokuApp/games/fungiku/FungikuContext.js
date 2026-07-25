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
  selectMushroomCount,
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

/** Board sizes offered today. The real ladder arrives in Step 6. */
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

  const cycleCell = useCallback(
    (cell) => dispatch({ type: FUNGIKU_ACTIONS.CYCLE_CELL, payload: { cell } }),
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
          payload: buildPuzzleState({ size, seed }),
        });
      } catch (error) {
        console.error('Fungiku generation failed:', error);
      }
    },
    [dispatch, state.size, state.seed]
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
      startPuzzle,
      nextPuzzle,
      changeSize,
      clearMarks,
      undo,
      redo,
    }),
    [state, conflicts, mushroomCount, solved, hasMarks, cycleCell, startPuzzle, nextPuzzle, changeSize, clearMarks, undo, redo]
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
