import AsyncStorage from '@react-native-async-storage/async-storage';
import { describeSudokuProgress } from './gameProgress';
import debounce from './debounce';

// Constants
// One key per game, so the modes never clobber each other's saved state
// (docs/fungiku-plan.md §6). Fungiku's lives in games/fungiku/storage.js.
export const STORAGE_KEY = '@SudokuGame';
export const STORAGE_VERSION = 2; // Incremented to handle addition of gameCompleted flag

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
 * Read a summary of the saved Sudoku game for the hub's Continue affordance.
 *
 * The hub renders before any game screen mounts, so it cannot ask GameContext —
 * it reads the same persisted snapshot the Sudoku screen hydrates from.
 *
 * @returns {Promise<{label: string, detail: string}|null>} null when there is
 *   no game to continue.
 */
export const readSudokuProgress = async () => {
  return describeSudokuProgress(await loadState());
};

/**
 * Read the last theme the player chose, so the hub and Fungiku match Sudoku
 * instead of always rendering in the default palette. Returns null when nothing
 * has been saved yet; callers fall back to the default theme.
 *
 * @returns {Promise<string|null>}
 */
export const readSavedThemeName = async () => {
  const saved = await loadState();
  return saved?.currentThemeName || null;
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
