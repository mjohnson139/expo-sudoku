import { useReducer, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
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
    // Call the original reducer
    const newState = reducerRef.current(state, action);
    
    // Save the new state (debounced in the storage utility)
    saveState(newState);
    
    return newState;
  };
  
  // Initialize with the provided initial state
  const [state, dispatch] = useReducer(persistentReducer, initialState);
  
  // Set up app state listener for background saves
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Force an immediate save when app is backgrounded
        saveState.flush && saveState.flush();
        saveState(state);
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [state]);
  
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