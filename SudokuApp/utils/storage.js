import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  GAME_STATE: '@SudokuApp:gameState',
  VERSION: '1.0', // For future migrations
};

/**
 * Save the current game state to AsyncStorage
 * @param {Object} gameState - The current game state to persist
 * @returns {Promise<void>}
 */
export const saveGameState = async (gameState) => {
  try {
    // Don't save if the game is not in progress
    if (!gameState.gameStarted || gameState.showWinModal) {
      return;
    }
    
    // Define the shape of data to be persisted
    const dataToSave = {
      version: STORAGE_KEYS.VERSION,
      timestamp: new Date().toISOString(),
      // Game board state
      board: gameState.board,
      solutionBoard: gameState.solutionBoard,
      initialBoardState: gameState.initialBoardState,
      initialCells: gameState.initialCells,
      cellNotes: gameState.cellNotes,
      cellFeedback: gameState.cellFeedback,
      filledCount: gameState.filledCount,
      selectedCell: gameState.selectedCell,
      // Game UI state
      showFeedback: gameState.showFeedback,
      notesMode: gameState.notesMode,
      isPaused: gameState.isPaused,
      // Timer state
      elapsedSeconds: gameState.elapsedSeconds,
      timerActive: gameState.timerActive,
      gameStarted: gameState.gameStarted,
      // Theme state
      currentThemeName: gameState.currentThemeName, 
      // Undo/redo state
      undoStack: gameState.undoStack,
      redoStack: gameState.redoStack,
    };

    console.log('Saving game state:', dataToSave.timestamp);
    const jsonValue = JSON.stringify(dataToSave);
    await AsyncStorage.setItem(STORAGE_KEYS.GAME_STATE, jsonValue);
  } catch (error) {
    console.error('Error saving game state:', error);
  }
};

/**
 * Load the saved game state from AsyncStorage
 * @returns {Promise<Object|null>} The saved game state or null if none exists
 */
export const loadGameState = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.GAME_STATE);
    
    if (!jsonValue) return null;
    
    const savedState = JSON.parse(jsonValue);
    
    // Version check for future migrations
    if (savedState.version !== STORAGE_KEYS.VERSION) {
      console.warn('Saved game state version mismatch. Clearing saved game.');
      await clearGameState();
      return null;
    }
    
    return savedState;
  } catch (error) {
    console.error('Error loading game state:', error);
    // If there's a parse error, clear the storage and return null
    await clearGameState();
    return null;
  }
};

/**
 * Clear the saved game state from AsyncStorage
 * @returns {Promise<void>}
 */
export const clearGameState = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  } catch (error) {
    console.error('Error clearing game state:', error);
  }
};

/**
 * Immediately save game state on app background/exit
 * (Non-debounced version for use when app is backgrounding)
 * @param {Object} gameState - The current game state to persist
 * @returns {Promise<void>}
 */
export const saveGameStateImmediate = async (gameState) => {
  try {
    if (!gameState || !gameState.gameStarted) {
      return;
    }
    
    console.log('Immediately saving game on background/exit');
    await saveGameState(gameState);
    
    // Return the savedTime to confirm when the save happened
    return new Date().toISOString();
  } catch (error) {
    console.error('Error immediate saving game state:', error);
    return null;
  }
};

/**
 * Debounced function for saving game state
 * @param {Function} func - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} - The debounced function
 */
export const debounce = (func, delay = 500) => {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// Create a debounced version of saveGameState
export const debouncedSaveGameState = debounce(saveGameState, 500);