import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
export const STORAGE_KEY = '@SudokuGame';
export const STORAGE_VERSION = 2; // Incremented to handle addition of gameCompleted flag

/**
 * Debounce function with flush capability for limiting the frequency of calls
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} - The debounced function with flush method
 */
const debounce = (func, wait) => {
  let timeout;
  let lastArgs = null;
  
  // Create the debounced function
  const debounced = (...args) => {
    lastArgs = args;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...lastArgs);
      lastArgs = null;
    }, wait);
  };
  
  // Add flush method to allow forcing execution
  debounced.flush = () => {
    if (timeout && lastArgs) {
      clearTimeout(timeout);
      func(...lastArgs);
      lastArgs = null;
    }
  };
  
  // Add cancel method to prevent execution
  debounced.cancel = () => {
    clearTimeout(timeout);
    lastArgs = null;
  };
  
  return debounced;
};

/**
 * Remove transient UI-only state fields before saving
 * @param {Object} state - The game state
 * @returns {Object} - The state without transient fields
 */
export const stripTransient = (state) => {
  // Remove UI-only fields that shouldn't be persisted
  const {
    // UI state that should not be persisted
    showMenu,
    isPaused,
    showWinModal,
    showBuildNotes,
    timerActive,
    // Large objects that don't need to be persisted or can be recalculated
    cellRelations, // This is a large object that can be recalculated
    lastScoredCell, // Temporary animation state
    // Keep gameCompleted in persistentState
    
    // Don't clone these as they'll be regenerated when needed
    ...persistentState
  } = state;
  
  return {
    ...persistentState,
    // Add storage version for future migration support
    _v: STORAGE_VERSION,
  };
};

/**
 * Load the game state from AsyncStorage
 * @returns {Promise<Object|null>} - The loaded state or null if not found
 */
export const loadState = async () => {
  try {
    const serializedState = await AsyncStorage.getItem(STORAGE_KEY);
    
    if (serializedState === null) {
      return null; // No saved state
    }
    
    const parsedState = JSON.parse(serializedState);
    
    // Handle version migration
    if (!parsedState._v || parsedState._v !== STORAGE_VERSION) {
      console.log(`Migrating storage from version ${parsedState._v || 'unknown'} to ${STORAGE_VERSION}`);
      
      // Version 1 to 2 migration: Handle gameCompleted flag
      if (parsedState._v === 1) {
        // If coming from version 1, ensure gameCompleted flag is set
        parsedState.gameCompleted = parsedState.gameCompleted || false;
        parsedState._v = STORAGE_VERSION;
      } else {
        // For other version mismatches, reset to default state
        console.log('Storage version cannot be migrated, using default state');
        return null;
      }
    }
    
    delete parsedState._v; // Remove version field
    
    // Set appropriate UI fields for restored state
    return {
      ...parsedState,
      timerActive: false, // Always start with timer paused
      isPaused: true, // Start in paused state
      showMenu: false, // Don't show menu on restore
      showWinModal: false, // Don't show win modal
      showBuildNotes: false, // Don't show build notes
      // Preserve gameCompleted flag from saved state or default to false
      gameCompleted: parsedState.gameCompleted ?? false,
    };
  } catch (error) {
    console.error('Error loading game state:', error);
    return null;
  }
};

/**
 * Save the game state to AsyncStorage (debounced)
 * @param {Object} state - The game state to save
 */
export const saveState = debounce(async (state) => {
  try {
    if (!state.gameStarted) {
      // Don't save if no game is in progress
      return;
    }
    
    // Avoid expensive operations during active interaction
    if (state.lastInteractionTimestamp && 
        Date.now() - state.lastInteractionTimestamp < 300) {
      // Too close to user interaction, reschedule save
      saveState(state); // Re-call debounced function which resets the timer
      return;
    }
    
    // Strip temporary UI state and add version
    const persistentState = stripTransient(state);
    
    // Save to AsyncStorage - use requestAnimationFrame to ensure UI is updated first
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(async () => {
        const serializedState = JSON.stringify(persistentState);
        await AsyncStorage.setItem(STORAGE_KEY, serializedState);
      });
    } else {
      // Fallback for environments without requestAnimationFrame
      const serializedState = JSON.stringify(persistentState);
      await AsyncStorage.setItem(STORAGE_KEY, serializedState);
    }
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}, 1000); // Increased debounce to 1000ms for better performance