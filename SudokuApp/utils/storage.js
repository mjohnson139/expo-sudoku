import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
export const STORAGE_KEY = '@SudokuGame';
export const STORAGE_VERSION = 1;

/**
 * Debounce function to limit the frequency of calls
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} - The debounced function
 */
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
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
    
    // Check for version mismatch - handle migrations here in the future
    if (!parsedState._v || parsedState._v !== STORAGE_VERSION) {
      console.log('Storage version mismatch, using default state');
      return null;
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
      gameCompleted: parsedState.gameCompleted || false,
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
    
    // Strip temporary UI state and add version
    const persistentState = stripTransient(state);
    
    // Save to AsyncStorage
    const serializedState = JSON.stringify(persistentState);
    await AsyncStorage.setItem(STORAGE_KEY, serializedState);
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}, 500); // Debounce for 500ms