import { useReducer, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { loadState, saveState } from '../utils/storage';

/**
 * Custom hook that extends useReducer with persistence capabilities
 *
 * This hook:
 * 1. Hydrates the initial state from storage
 * 2. Saves state changes to storage (debounced)
 * 3. Handles app state changes to ensure state is saved when app backgrounds
 * 4. Flushes any pending write when it unmounts
 *
 * Persistence is injected so each game keeps its own storage key and its own
 * idea of what is worth saving (docs/fungiku-plan.md §6). Sudoku's loaders are
 * the default, so its call site reads exactly as it did before Fungiku existed.
 *
 * @param {Function} reducer - The reducer function
 * @param {Object} initialState - The initial state
 * @param {string} actionType - The action type to dispatch when restoring state
 * @param {Object} [persistence] - `{ load, save }`; `save` needs a `.flush()`
 * @returns {[Object, Function, boolean]} - [state, dispatch, hydrated]
 */
const usePersistentReducer = (
  reducer,
  initialState,
  actionType,
  persistence = { load: loadState, save: saveState }
) => {
  // Track if the state has been hydrated from storage
  const [hydrated, setHydrated] = useState(false);

  // Use a ref to hold the actual reducer to avoid unnecessary rerenders
  const reducerRef = useRef(reducer);

  // Persistence functions are read through a ref so passing a fresh object
  // literal on every render can't retrigger hydration or resubscribe listeners.
  const persistenceRef = useRef(persistence);
  persistenceRef.current = persistence;

  // Create a wrapper reducer that will save state changes
  const persistentReducer = (state, action) => {
    // Call the original reducer
    const newState = reducerRef.current(state, action);

    // Save the new state (debounced in the storage utility)
    persistenceRef.current.save(newState);

    return newState;
  };

  // Initialize with the provided initial state
  const [state, dispatch] = useReducer(persistentReducer, initialState);

  // Set up app state listener for background saves
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Force an immediate save when app is backgrounded
        const { save } = persistenceRef.current;
        save.flush && save.flush();
        save(state);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [state]);

  // Flush any pending write when the provider unmounts.
  //
  // Writes are debounced by 500ms, and a game screen unmounts as soon as the
  // player leaves for the hub — without this, leaving right after a move would
  // drop that move. Leaving a game is not quitting it (plan §6), so the last
  // state has to reach storage before the screen goes away.
  useEffect(() => {
    return () => {
      const { save } = persistenceRef.current;
      if (save.flush) {
        save.flush();
      }
    };
  }, []);

  // Load saved state on initial mount
  useEffect(() => {
    const hydrateState = async () => {
      try {
        const savedState = await persistenceRef.current.load();

        if (savedState !== null) {
          // Dispatch the restore action with the saved state
          dispatch({
            type: actionType,
            payload: savedState,
          });
        }

        // Mark as hydrated whether we restored state or not
        setHydrated(true);
      } catch (error) {
        console.error('Error hydrating state:', error);
        setHydrated(true); // Still mark as hydrated to prevent blocking UI
      }
    };

    hydrateState();
  }, [actionType]);

  return [state, dispatch, hydrated];
};

export default usePersistentReducer;
