import { useReducer, useEffect, useState, useRef, useCallback } from 'react';
import { AppState, InteractionManager, Platform } from 'react-native';
import { loadState, saveState } from '../utils/storage';

/**
 * Custom hook that extends useReducer with persistence capabilities
 * 
 * This hook:
 * 1. Hydrates the initial state from AsyncStorage
 * 2. Saves state changes to AsyncStorage (debounced)
 * 3. Handles app state changes to ensure state is saved when app backgrounds
 * 
 * @param {Function} reducer - The reducer function
 * @param {Object} initialState - The initial state
 * @param {string} actionType - The action type to dispatch when restoring state
 * @returns {[Object, Function, boolean]} - [state, dispatch, hydrated]
 */
const usePersistentReducer = (reducer, initialState, actionType) => {
  // Track if the state has been hydrated from storage
  const [hydrated, setHydrated] = useState(false);
  
  // Use a ref to hold the actual reducer to avoid unnecessary rerenders
  const reducerRef = useRef(reducer);
  
  // Create a wrapper reducer that will save state changes
  const persistentReducer = (state, action) => {
    // Determine if this is an interaction-critical action that needs immediate UI update
    // On Android, treat almost all actions as UI-critical for better responsiveness
    const isInteractionCritical = Platform.OS === 'android' ? 
      // On Android, only a few actions should trigger deferred updates
      !['START_GAME', 'TICK_TIMER', 'RESTORE_SAVED_GAME'].includes(action.type) :
      // On iOS, use the original selective list
      [
        'SELECT_CELL',
        'TOGGLE_NOTES_MODE',
        'PAUSE_GAME',
        'RESUME_GAME',
        'SHOW_MENU',
        'HIDE_MENU',
        'SHOW_WIN_MODAL',
        'HIDE_WIN_MODAL'
      ].includes(action.type);
    
    // Call the original reducer
    const newState = reducerRef.current(state, action);
    
    // For interaction-critical actions, defer saving to after UI update
    if (isInteractionCritical) {
      // Add timestamp for optimization in saveState
      const stateWithTimestamp = {
        ...newState,
        lastInteractionTimestamp: Date.now()
      };
      
      // On Android, use a longer delay to ensure UI is fully updated
      if (Platform.OS === 'android') {
        // Longer timeout for Android
        setTimeout(() => {
          saveState(stateWithTimestamp);
        }, 300);
      } else {
        // Use InteractionManager on iOS
        InteractionManager.runAfterInteractions(() => {
          saveState(stateWithTimestamp);
        });
      }
      
      return stateWithTimestamp;
    } else {
      // For non-critical actions, save normally (still debounced in storage.js)
      saveState(newState);
      return newState;
    }
  };
  
  // Initialize with the provided initial state
  const [state, dispatch] = useReducer(persistentReducer, initialState);
  
  // Create a memoized function to handle app state changes
  const handleAppStateChange = useCallback((nextAppState) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Force an immediate save when app is backgrounded
      saveState.flush && saveState.flush();
    }
  }, []); // No dependencies to avoid re-creating on state changes
  
  // Set up app state listener for background saves
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);
  
  // Load saved state on initial mount
  useEffect(() => {
    const hydrateState = async () => {
      try {
        const savedState = await loadState();
        
        if (savedState !== null) {
          // Dispatch the restore action with the saved state
          dispatch({ 
            type: actionType, 
            payload: savedState 
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