import React, { createContext, useContext, useEffect, useRef } from 'react';
import THEMES from '../utils/themes';
import { generateSudoku, isCorrectValue as checkCorrectValue } from '../utils/boardFactory';
import usePersistentReducer from '../hooks/usePersistentReducer';

// Initialize with empty Sudoku board
const emptyBoard = Array.from({ length: 9 }, () => Array(9).fill(0));

// Action Types
export const ACTIONS = {
  START_GAME: 'START_GAME',
  SELECT_CELL: 'SELECT_CELL',
  SET_VALUE: 'SET_VALUE',
  CLEAR_VALUE: 'CLEAR_VALUE',
  ADD_NOTE: 'ADD_NOTE',
  REMOVE_NOTE: 'REMOVE_NOTE',
  TOGGLE_NOTES_MODE: 'TOGGLE_NOTES_MODE',
  TOGGLE_FEEDBACK: 'TOGGLE_FEEDBACK',
  CHANGE_THEME: 'CHANGE_THEME',
  UNDO: 'UNDO',
  REDO: 'REDO',
  
  // Timer actions
  START_TIMER: 'START_TIMER',
  PAUSE_TIMER: 'PAUSE_TIMER',
  TICK_TIMER: 'TICK_TIMER',
  RESET_TIMER: 'RESET_TIMER',
  
  // UI actions
  SHOW_MENU: 'SHOW_MENU',
  HIDE_MENU: 'HIDE_MENU',
  PAUSE_GAME: 'PAUSE_GAME',
  RESUME_GAME: 'RESUME_GAME',
  QUIT_GAME: 'QUIT_GAME',
  SHOW_WIN_MODAL: 'SHOW_WIN_MODAL',
  HIDE_WIN_MODAL: 'HIDE_WIN_MODAL',
  SHOW_BUILD_NOTES: 'SHOW_BUILD_NOTES',
  HIDE_BUILD_NOTES: 'HIDE_BUILD_NOTES',
  
  // Future - for AsyncStorage
  RESTORE_SAVED_GAME: 'RESTORE_SAVED_GAME',
};

// Initial game state
const initialState = {
  // Game board state
  board: emptyBoard,
  solutionBoard: emptyBoard,
  initialBoardState: emptyBoard,
  selectedCell: null,
  initialCells: [],
  cellNotes: {},
  cellFeedback: {},
  filledCount: 0,

  // Game UI state
  showFeedback: false,
  notesMode: false,

  // Timer state
  elapsedSeconds: 0,
  timerActive: false,
  gameStarted: false, // Added flag to track if a game has been started
  gameCompleted: false, // Flag to track if the current game has been completed

  // Theme state
  currentThemeName: 'classic',
  theme: THEMES.classic,

  // Undo/redo state
  undoStack: [],
  redoStack: [],

  // Modal state
  showMenu: true,
  isPaused: false,
  showWinModal: false,
  showBuildNotes: false,
};

// Helper function to get initial cells positions from a board
const getInitialCells = (board) => {
  const initialPositions = [];
  board.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value !== 0) {
        initialPositions.push(`${rowIndex}-${colIndex}`);
      }
    });
  });
  return initialPositions;
};

// Helper function to check if cells are related (same row, column or box)
const areCellsRelated = (cell1Row, cell1Col, cell2Row, cell2Col) => {
  // Same row
  if (cell1Row === cell2Row) return true;
  
  // Same column
  if (cell1Col === cell2Col) return true;
  
  // Same 3x3 box
  const box1Row = Math.floor(cell1Row / 3);
  const box1Col = Math.floor(cell1Col / 3);
  const box2Row = Math.floor(cell2Row / 3);
  const box2Col = Math.floor(cell2Col / 3);
  
  return box1Row === box2Row && box1Col === box2Col;
};

// Helper function to update notes when a value is placed
const updateRelatedNotes = (notes, row, col, value) => {
  // Don't update notes if value is 0 (clearing a cell) or if value is invalid
  if (value <= 0 || value > 9) return notes;
  
  const updatedNotes = { ...notes };
  let hasChanges = false;
  
  // Go through all cells with notes
  Object.keys(updatedNotes).forEach(cellKey => {
    const [cellRow, cellCol] = cellKey.split('-').map(Number);
    
    // Check if this cell is related to the cell where a value was placed
    if (areCellsRelated(row, col, cellRow, cellCol)) {
      const cellNotes = updatedNotes[cellKey];
      
      // If the notes include the value that was placed, remove it
      if (cellNotes.includes(value)) {
        const newCellNotes = cellNotes.filter(n => n !== value);
        
        if (newCellNotes.length === 0) {
          // If no notes left, remove the entry
          delete updatedNotes[cellKey];
        } else {
          // Otherwise update with the new notes array
          updatedNotes[cellKey] = newCellNotes;
        }
        
        hasChanges = true;
      }
    }
  });
  
  return hasChanges ? updatedNotes : notes;
};

// Game reducer
function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.START_GAME: {
      const { board, solution, difficulty } = action.payload;
      const initialCells = getInitialCells(board);
      const initialCount = board.flat().filter(v => v !== 0).length;

      return {
        ...state,
        board,
        solutionBoard: solution,
        initialBoardState: board,
        selectedCell: null,
        initialCells,
        cellNotes: {},
        cellFeedback: {},
        showFeedback: false,
        notesMode: false,
        filledCount: initialCount,
        showMenu: false,
        isPaused: false,
        showWinModal: false,
        elapsedSeconds: 0,
        timerActive: true,
        gameStarted: true, // Set game as started when starting a new game
        gameCompleted: false, // Reset game completed flag when starting a new game
        undoStack: [],
        redoStack: [],
      };
    }
    
    case ACTIONS.SELECT_CELL:
      return {
        ...state,
        selectedCell: action.payload, // { row, col }
      };
    
    case ACTIONS.SET_VALUE: {
      const { row, col, value } = action.payload;
      const cellKey = `${row}-${col}`;
      
      // Check if this is an initial (fixed) cell
      if (state.initialCells.includes(cellKey)) {
        return state;
      }
      
      const newBoard = state.board.map((r, ri) => 
        ri === row 
          ? r.map((c, ci) => ci === col ? value : c) 
          : [...r]
      );
      
      // Update filled count for win detection
      const currentValue = state.board[row][col];
      let newFilledCount = state.filledCount;
      if (currentValue === 0 && value !== 0) {
        newFilledCount++;
      } else if (currentValue !== 0 && value === 0) {
        newFilledCount--;
      }
      
      // Calculate new feedback if enabled
      let newFeedback = { ...state.cellFeedback };
      if (state.showFeedback) {
        if (value !== 0) {
          newFeedback[cellKey] = checkCorrectValue(state.solutionBoard, row, col, value);
        } else {
          delete newFeedback[cellKey];
        }
      }
      
      // Remove notes for this cell when setting a value
      let newNotes = { ...state.cellNotes };
      if (value !== 0 && newNotes[cellKey]) {
        delete newNotes[cellKey];
      }
      
      // Update related notes if a value was placed
      if (value !== 0) {
        newNotes = updateRelatedNotes(newNotes, row, col, value);
      }
      
      // Record action for undo
      const undoAction = {
        type: value === 0 ? 'clearValue' : 'setValue',
        cellKey,
        previousValue: currentValue,
        newValue: value,
        previousNotes: state.cellNotes[cellKey],
      };
      
      return {
        ...state,
        board: newBoard,
        filledCount: newFilledCount,
        cellFeedback: newFeedback,
        cellNotes: newNotes,
        undoStack: [...state.undoStack, undoAction],
        redoStack: [], // Clear redo stack on new action
      };
    }
    
    case ACTIONS.ADD_NOTE: {
      const { row, col, noteValue } = action.payload;
      const cellKey = `${row}-${col}`;
      
      if (state.initialCells.includes(cellKey)) {
        return state;
      }
      
      const currentNotes = state.cellNotes[cellKey] || [];
      const newNotes = [...currentNotes, noteValue];
      
      // Record action for undo
      const undoAction = {
        type: 'addNote',
        cellKey,
        previousNotes: currentNotes,
        newNotes,
        noteValue,
      };
      
      const updatedNotes = { ...state.cellNotes };
      updatedNotes[cellKey] = newNotes;
      
      return {
        ...state,
        cellNotes: updatedNotes,
        undoStack: [...state.undoStack, undoAction],
        redoStack: [], // Clear redo stack on new action
      };
    }
    
    case ACTIONS.REMOVE_NOTE: {
      const { row, col, noteValue } = action.payload;
      const cellKey = `${row}-${col}`;
      
      const currentNotes = state.cellNotes[cellKey] || [];
      if (!currentNotes.includes(noteValue)) {
        return state;
      }
      
      const newNotes = currentNotes.filter(n => n !== noteValue);
      
      // Record action for undo
      const undoAction = {
        type: 'removeNote',
        cellKey,
        previousNotes: currentNotes,
        newNotes,
        noteValue,
      };
      
      const updatedNotes = { ...state.cellNotes };
      if (newNotes.length === 0) {
        delete updatedNotes[cellKey];
      } else {
        updatedNotes[cellKey] = newNotes;
      }
      
      return {
        ...state,
        cellNotes: updatedNotes,
        undoStack: [...state.undoStack, undoAction],
        redoStack: [], // Clear redo stack on new action
      };
    }
    
    case ACTIONS.TOGGLE_NOTES_MODE:
      return {
        ...state,
        notesMode: !state.notesMode,
      };
    
    case ACTIONS.TOGGLE_FEEDBACK: {
      const newShowFeedback = action.payload !== undefined 
        ? action.payload 
        : !state.showFeedback;
      
      // If turning off feedback, clear all feedback
      if (!newShowFeedback) {
        return {
          ...state,
          showFeedback: false,
          cellFeedback: {},
        };
      }
      
      // If turning on feedback, calculate feedback for all user-entered cells
      const newFeedback = {};
      state.board.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          const cellKey = `${rowIndex}-${colIndex}`;
          // Only check user-entered values (not initial or empty)
          if (!state.initialCells.includes(cellKey) && value !== 0) {
            newFeedback[cellKey] = checkCorrectValue(
              state.solutionBoard, rowIndex, colIndex, value
            );
          }
        });
      });
      
      return {
        ...state,
        showFeedback: true,
        cellFeedback: newFeedback,
      };
    }
    
    case ACTIONS.CHANGE_THEME: {
      const themeName = action.payload;
      return {
        ...state,
        currentThemeName: themeName,
        theme: THEMES[themeName],
      };
    }
    
    case ACTIONS.UNDO: {
      if (state.undoStack.length === 0) {
        return state;
      }
      
      const lastAction = state.undoStack[state.undoStack.length - 1];
      const { type, cellKey, previousValue, newValue, previousNotes, newNotes, noteValue } = lastAction;
      const [row, col] = cellKey.split('-').map(Number);
      
      if (type === 'setValue' || type === 'clearValue') {
        // Restore previous board value
        const newBoard = state.board.map((r, ri) => 
          ri === row 
            ? r.map((c, ci) => ci === col ? previousValue : c) 
            : [...r]
        );
        
        // Update filled count
        let newFilledCount = state.filledCount;
        if (previousValue === 0 && newValue !== 0) {
          newFilledCount--;
        } else if (previousValue !== 0 && newValue === 0) {
          newFilledCount++;
        }
        
        // Restore previous notes if any
        const newCellNotes = { ...state.cellNotes };
        if (previousNotes && previousNotes.length > 0) {
          newCellNotes[cellKey] = previousNotes;
        }
        
        // Remove feedback for this cell if any
        const newFeedback = { ...state.cellFeedback };
        delete newFeedback[cellKey];
        
        return {
          ...state,
          board: newBoard,
          filledCount: newFilledCount,
          cellNotes: newCellNotes,
          cellFeedback: newFeedback,
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, lastAction],
        };
      }
      
      if (type === 'addNote' || type === 'removeNote') {
        // Restore previous notes
        const newCellNotes = { ...state.cellNotes };
        if (previousNotes && previousNotes.length > 0) {
          newCellNotes[cellKey] = previousNotes;
        } else {
          delete newCellNotes[cellKey];
        }
        
        return {
          ...state,
          cellNotes: newCellNotes,
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, lastAction],
        };
      }
      
      return state;
    }
    
    case ACTIONS.REDO: {
      if (state.redoStack.length === 0) {
        return state;
      }
      
      const lastAction = state.redoStack[state.redoStack.length - 1];
      const { type, cellKey, previousValue, newValue, previousNotes, newNotes, noteValue } = lastAction;
      const [row, col] = cellKey.split('-').map(Number);
      
      if (type === 'setValue' || type === 'clearValue') {
        // Reapply the value change
        const newBoard = state.board.map((r, ri) => 
          ri === row 
            ? r.map((c, ci) => ci === col ? newValue : c) 
            : [...r]
        );
        
        // Update filled count
        let newFilledCount = state.filledCount;
        if (previousValue === 0 && newValue !== 0) {
          newFilledCount++;
        } else if (previousValue !== 0 && newValue === 0) {
          newFilledCount--;
        }
        
        // Remove notes for this cell if setting a value
        const newCellNotes = { ...state.cellNotes };
        if (newValue !== 0) {
          delete newCellNotes[cellKey];
        }
        
        // Update feedback if enabled
        let newFeedback = { ...state.cellFeedback };
        if (state.showFeedback && newValue !== 0) {
          newFeedback[cellKey] = checkCorrectValue(state.solutionBoard, row, col, newValue);
        } else if (state.showFeedback && newValue === 0) {
          delete newFeedback[cellKey];
        }
        
        return {
          ...state,
          board: newBoard,
          filledCount: newFilledCount,
          cellNotes: newCellNotes,
          cellFeedback: newFeedback,
          undoStack: [...state.undoStack, lastAction],
          redoStack: state.redoStack.slice(0, -1),
        };
      }
      
      if (type === 'addNote' || type === 'removeNote') {
        // Reapply the note change
        const newCellNotes = { ...state.cellNotes };
        if (newNotes && newNotes.length > 0) {
          newCellNotes[cellKey] = newNotes;
        } else {
          delete newCellNotes[cellKey];
        }
        
        return {
          ...state,
          cellNotes: newCellNotes,
          undoStack: [...state.undoStack, lastAction],
          redoStack: state.redoStack.slice(0, -1),
        };
      }
      
      return state;
    }
    
    case ACTIONS.START_TIMER:
      return {
        ...state,
        timerActive: true,
      };
    
    case ACTIONS.PAUSE_TIMER:
      return {
        ...state,
        timerActive: false,
      };
    
    case ACTIONS.TICK_TIMER:
      return {
        ...state,
        elapsedSeconds: state.elapsedSeconds + 1,
      };
    
    case ACTIONS.RESET_TIMER:
      return {
        ...state,
        elapsedSeconds: 0,
        timerActive: false,
      };
    
    case ACTIONS.PAUSE_GAME:
      return {
        ...state,
        isPaused: true,
        timerActive: false, // Pause timer
      };
    
    case ACTIONS.RESUME_GAME:
      return {
        ...state,
        isPaused: false,
        // Only resume timer if the game is not completed
        timerActive: !state.gameCompleted,
      };
    
    case ACTIONS.QUIT_GAME:
      return {
        ...state,
        isPaused: false,
        showMenu: true,
        timerActive: false, // Ensure timer is off when quitting
        gameStarted: false, // Reset game started flag
        gameCompleted: false, // Reset game completed flag
      };
    
    case ACTIONS.SHOW_MENU:
      return {
        ...state,
        showMenu: true,
        timerActive: false, // Pause timer when menu is shown
      };
    
    case ACTIONS.HIDE_MENU:
      return {
        ...state,
        showMenu: false,
        // Only resume timer if a game has been started, not completed, and not paused or in win state
        timerActive: state.gameStarted && !state.gameCompleted && !state.showWinModal && !state.isPaused,
      };
    
    case ACTIONS.SHOW_WIN_MODAL:
      return {
        ...state,
        showWinModal: true,
        timerActive: false, // Pause timer when win
        gameCompleted: true, // Mark the game as completed when showing win modal
      };

    case ACTIONS.HIDE_WIN_MODAL:
      return {
        ...state,
        showWinModal: false,
        // Don't resume timer here - user will likely start a new game
        // Keep gameCompleted as true
      };
    
    case ACTIONS.SHOW_BUILD_NOTES:
      return {
        ...state,
        showBuildNotes: true,
      };
    
    case ACTIONS.HIDE_BUILD_NOTES:
      return {
        ...state,
        showBuildNotes: false,
      };
    
    case ACTIONS.RESTORE_SAVED_GAME:
      // For future AsyncStorage integration
      return {
        ...state,
        ...action.payload,
      };
    
    default:
      return state;
  }
}

// Create context
const GameContext = createContext();

// Game provider component
export const GameProvider = ({ children }) => {
  const [state, dispatch, hydrated] = usePersistentReducer(
    gameReducer,
    initialState,
    ACTIONS.RESTORE_SAVED_GAME
  );
  const timerRef = useRef(null);
  
  // Effect for timer
  useEffect(() => {
    if (state.timerActive) {
      timerRef.current = setInterval(() => {
        dispatch({ type: ACTIONS.TICK_TIMER });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.timerActive]);
  
  // Check for win condition when filledCount changes
  useEffect(() => {
    // Only check for win if the game isn't already completed
    if (state.filledCount === 81 && !state.gameCompleted) {
      let won = true;
      for (let i = 0; i < 9 && won; i++) {
        for (let j = 0; j < 9 && won; j++) {
          if (state.board[i][j] !== state.solutionBoard[i][j]) {
            won = false;
          }
        }
      }
      if (won) {
        dispatch({ type: ACTIONS.SHOW_WIN_MODAL });
      }
    }
  }, [state.filledCount, state.board, state.solutionBoard, state.gameCompleted]);

  // Helper function to start a new game
  const startNewGame = (difficulty) => {
    const { board, solution } = generateSudoku(difficulty);
    dispatch({
      type: ACTIONS.START_GAME,
      payload: { board, solution, difficulty },
    });
  };
  
  // Helper for handling number selection (supports both setValue and notes)
  const handleNumberSelect = (num) => {
    if (!state.selectedCell) return;
    
    const { row, col } = state.selectedCell;
    const cellKey = `${row}-${col}`;
    
    // Prevent modifying initial cells
    if (state.initialCells.includes(cellKey)) {
      return;
    }

    if (state.notesMode) {
      // Notes mode
      const currentNotes = state.cellNotes[cellKey] || [];
      if (currentNotes.includes(num)) {
        dispatch({
          type: ACTIONS.REMOVE_NOTE,
          payload: { row, col, noteValue: num },
        });
      } else {
        dispatch({
          type: ACTIONS.ADD_NOTE,
          payload: { row, col, noteValue: num },
        });
      }
    } else {
      // Regular mode - set/toggle value
      const currentValue = state.board[row][col];
      const newValue = (currentValue === num) ? 0 : num;
      
      dispatch({
        type: ACTIONS.SET_VALUE,
        payload: { row, col, value: newValue },
      });
    }
  };
  
  // Format timer as mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  
  // Debug function to fill board except last cell
  const debugFillBoard = () => {
    // Create a new board from initial state
    const newBoard = state.initialBoardState.map(row => [...row]);
    const blanks = [];
    
    // Find all blank positions in initial puzzle
    state.initialBoardState.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v === 0) blanks.push({ r, c });
      });
    });
    
    if (blanks.length === 0) return;
    
    // Leave the last blank unfilled
    const last = blanks[blanks.length - 1];
    
    // Fill all other blanks with solution values
    blanks.forEach(({ r, c }) => {
      if (r === last.r && c === last.c) return;
      newBoard[r][c] = state.solutionBoard[r][c];
    });
    
    // Track how many cells are filled
    const filledCount = 81 - 1; // All cells except one
    
    // Update state
    dispatch({
      type: ACTIONS.START_GAME,
      payload: { 
        board: newBoard, 
        solution: state.solutionBoard,
        difficulty: 'debug',
      },
    });
    
    // Manually set filled count for win detection
    state.filledCount = filledCount;
  };
  
  // Cycle through available themes
  const cycleTheme = () => {
    const themeKeys = Object.keys(THEMES);
    const currentIndex = themeKeys.indexOf(state.currentThemeName);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    const nextThemeName = themeKeys[nextIndex];
    
    dispatch({
      type: ACTIONS.CHANGE_THEME,
      payload: nextThemeName,
    });
  };
  
  // Create the value object
  const value = {
    ...state,
    dispatch,
    startNewGame,
    handleNumberSelect,
    formatTime,
    cycleTheme,
    debugFillBoard,
  };

  // Only render children once state has been hydrated from storage
  return (
    <GameContext.Provider value={value}>
      {hydrated ? children : null}
    </GameContext.Provider>
  );
};

// Custom hook for using game context
export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};