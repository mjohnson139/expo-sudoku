import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import SUDOKU_THEMES from '../utils/themes';
import { generateSudoku, isCorrectValue as checkCorrectValue } from '../utils/boardFactory';
import usePersistentReducer from '../hooks/usePersistentReducer';
import { loadStatistics, saveStatistics, recordGameStarted, recordGameCompleted, initialStatistics } from '../utils/statistics';

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
  NEW_GAME: 'NEW_GAME', // New action that has same behavior as QUIT_GAME but better naming
  SHOW_WIN_MODAL: 'SHOW_WIN_MODAL',
  HIDE_WIN_MODAL: 'HIDE_WIN_MODAL',
  SHOW_BUILD_NOTES: 'SHOW_BUILD_NOTES',
  HIDE_BUILD_NOTES: 'HIDE_BUILD_NOTES',
  SHOW_STATISTICS: 'SHOW_STATISTICS',
  HIDE_STATISTICS: 'HIDE_STATISTICS',

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
  difficulty: 'medium', // Default difficulty level - DO NOT change without updating GameTopStrip.js

  // Timer state
  elapsedSeconds: 0,
  timerActive: false,
  gameStarted: false, // Added flag to track if a game has been started

  gameCompleted: false, // Flag to track if the current game has been completed

  // Score state
  score: 0,
  lastMoveTimestamp: null,
  completedRows: [],
  completedColumns: [],
  completedBoxes: [],
  scoredCells: {}, // Track which cells have already been scored
  lastScoredCell: null, // Store position of last scored cell for animations
  
  // Theme state
  currentThemeName: 'classic',
  theme: SUDOKU_THEMES.classic,

  // Undo/redo state
  undoStack: [],
  redoStack: [],

  // Modal state
  showMenu: true,
  isPaused: false,
  showWinModal: false,
  showBuildNotes: false,
  showStatistics: false,

  // Game info for statistics
  currentDifficulty: null,
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

// Scoring Constants
const SCORE_BASE_POINTS = 10;       // Base points for a correct cell
const SCORE_SPEED_MULTIPLIER = 5;   // Multiplier for speed (points per second saved)
const SCORE_ROW_BONUS = 50;         // Bonus for completing a row
const SCORE_COLUMN_BONUS = 50;      // Bonus for completing a column
const SCORE_BOX_BONUS = 75;         // Bonus for completing a 3x3 box
const MAX_MOVE_TIME = 30;           // Max seconds for speed calculation (prevents extreme penalties)

// Helper function to calculate time-based score for a move
const calculateMoveScore = (lastMoveTimestamp, difficulty) => {
  if (!lastMoveTimestamp) return SCORE_BASE_POINTS; // First move gets base points
  
  // Calculate time since last move in seconds
  const now = Date.now();
  const timeDelta = Math.min((now - lastMoveTimestamp) / 1000, MAX_MOVE_TIME);
  
  // Apply difficulty multiplier
  let difficultyMultiplier = 1;
  switch (difficulty) {
    case 'easy': difficultyMultiplier = 0.8; break;
    case 'medium': difficultyMultiplier = 1.0; break;
    case 'hard': difficultyMultiplier = 1.5; break;
    case 'expert': difficultyMultiplier = 2.0; break;
    default: difficultyMultiplier = 1.0;
  }
  
  // Calculate speed bonus (inverse to time - faster is better)
  // Formula: basePoints + (maxTime - actualTime) * speedMultiplier
  // Ensures a minimum score of basePoints
  const speedBonus = Math.max(0, (MAX_MOVE_TIME - timeDelta) * SCORE_SPEED_MULTIPLIER);
  
  // Total points for this move
  return Math.round((SCORE_BASE_POINTS + speedBonus) * difficultyMultiplier);
};

// Helper function to check if a row is complete
const isRowComplete = (board, rowIndex) => {
  const row = board[rowIndex];
  // Check if every cell in the row is filled (not 0) and unique (no repeats)
  return row.every(cell => cell !== 0) && new Set(row).size === 9;
};

// Helper function to check if a column is complete
const isColumnComplete = (board, colIndex) => {
  const column = board.map(row => row[colIndex]);
  // Check if every cell in the column is filled (not 0) and unique (no repeats)
  return column.every(cell => cell !== 0) && new Set(column).size === 9;
};

// Helper function to check if a 3x3 box is complete
const isBoxComplete = (board, rowIndex, colIndex) => {
  // Find the top-left corner of the 3x3 box
  const boxRow = Math.floor(rowIndex / 3) * 3;
  const boxCol = Math.floor(colIndex / 3) * 3;
  
  // Get all values in the box
  const boxValues = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      boxValues.push(board[boxRow + r][boxCol + c]);
    }
  }
  
  // Check if every cell in the box is filled (not 0) and unique (no repeats)
  return boxValues.every(cell => cell !== 0) && new Set(boxValues).size === 9;
};

// Helper function to get box index (0-8) from row and column
const getBoxIndex = (row, col) => {
  const boxRow = Math.floor(row / 3);
  const boxCol = Math.floor(col / 3);
  return boxRow * 3 + boxCol;
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
        difficulty, // Store the current difficulty level
        filledCount: initialCount,
        showMenu: false,
        isPaused: false,
        showWinModal: false,
        showStatistics: false,
        elapsedSeconds: 0,
        timerActive: true,
        gameStarted: true, // Set game as started when starting a new game
        gameCompleted: false, // Reset game completed flag when starting a new game
        // Reset scoring state
        score: 0,
        lastMoveTimestamp: Date.now(),
        completedRows: [],
        completedColumns: [],
        completedBoxes: [],
        scoredCells: {},
        lastScoredCell: null,
        undoStack: [],
        redoStack: [],
        currentDifficulty: difficulty, // Store difficulty for statistics tracking
      };
    }
    
    case ACTIONS.SELECT_CELL:
      // Prevent cell selection if the game is completed
      if (state.gameCompleted) {
        return state;
      }
      return {
        ...state,
        selectedCell: action.payload, // { row, col }
      };
    
    case ACTIONS.SET_VALUE: {
      const { row, col, value } = action.payload;
      const cellKey = `${row}-${col}`;

      // Prevent modifications if game is completed or if this is an initial cell
      if (state.gameCompleted || state.initialCells.includes(cellKey)) {
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
      
      // Calculate score update only if a value is being set (not cleared)
      // and if the value is correct according to the solution
      let newScore = state.score;
      let newLastMoveTimestamp = state.lastMoveTimestamp;
      let completedRows = [...state.completedRows];
      let completedColumns = [...state.completedColumns];
      let completedBoxes = [...state.completedBoxes];
      let scoredCells = { ...state.scoredCells };
      
      if (value !== 0 && value === state.solutionBoard[row][col]) {
        // Only score this cell if it hasn't been scored before
        if (!scoredCells[cellKey]) {
          // Calculate base move score based on time and difficulty
          const moveScore = calculateMoveScore(state.lastMoveTimestamp, state.difficulty);
          newScore += moveScore;
          
          // Mark this cell as scored and store the points earned for animations
          scoredCells[cellKey] = moveScore;
          
          // Save the position of the last scored cell for animations
          // Clone the object to ensure we're creating a new reference that will trigger useEffect
          state.lastScoredCell = { 
            row, 
            col, 
            points: moveScore 
          };
        }
        
        // Always update timestamp for next move
        newLastMoveTimestamp = Date.now();
        
        // Check for completed row
        let completionBonus = 0;
        
        if (!completedRows.includes(row) && isRowComplete(newBoard, row)) {
          completedRows.push(row);
          completionBonus += SCORE_ROW_BONUS;
        }
        
        // Check for completed column
        if (!completedColumns.includes(col) && isColumnComplete(newBoard, col)) {
          completedColumns.push(col);
          completionBonus += SCORE_COLUMN_BONUS;
        }
        
        // Check for completed box
        const boxIndex = getBoxIndex(row, col);
        if (!completedBoxes.includes(boxIndex) && isBoxComplete(newBoard, row, col)) {
          completedBoxes.push(boxIndex);
          completionBonus += SCORE_BOX_BONUS;
        }
        
        // Add any completion bonuses to the score and to the cell's scored value
        if (completionBonus > 0) {
          newScore += completionBonus;
          // Update the cell's score with total points (base + completion bonus)
          scoredCells[cellKey] += completionBonus;
          
          // Update the points in the last scored cell for animations
          // Create a new object to ensure the reference changes and triggers useEffect
          if (state.lastScoredCell) {
            const currentPoints = state.lastScoredCell.points;
            // Replace with a new object to ensure reference changes
            state.lastScoredCell = {
              ...state.lastScoredCell,
              points: currentPoints + completionBonus
            };
          }
        }
      } else if (value === 0) {
        // If clearing a cell, just update the timestamp without scoring
        // Don't remove from scoredCells - once a cell is scored, it stays scored
        newLastMoveTimestamp = Date.now();
      }
      
      return {
        ...state,
        board: newBoard,
        filledCount: newFilledCount,
        cellFeedback: newFeedback,
        cellNotes: newNotes,
        undoStack: [...state.undoStack, undoAction],
        redoStack: [], // Clear redo stack on new action
        score: newScore,
        lastMoveTimestamp: newLastMoveTimestamp,
        completedRows,
        completedColumns,
        completedBoxes,
        scoredCells,
      };
    }
    
    case ACTIONS.ADD_NOTE: {
      const { row, col, noteValue } = action.payload;
      const cellKey = `${row}-${col}`;

      // Prevent modifications if game is completed or if this is an initial cell
      if (state.gameCompleted || state.initialCells.includes(cellKey)) {
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
        lastMoveTimestamp: Date.now(), // Update timestamp on note actions too
      };
    }
    
    case ACTIONS.REMOVE_NOTE: {
      const { row, col, noteValue } = action.payload;
      const cellKey = `${row}-${col}`;

      // Prevent modifications if game is completed
      if (state.gameCompleted) {
        return state;
      }

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
        lastMoveTimestamp: Date.now(), // Update timestamp on note actions too
      };
    }
    
    case ACTIONS.TOGGLE_NOTES_MODE:
      // Prevent notes mode toggle if game is completed
      if (state.gameCompleted) {
        return state;
      }
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
        theme: SUDOKU_THEMES[themeName],
      };
    }
    
    case ACTIONS.UNDO: {
      // Prevent undo if game is completed or if undo stack is empty
      if (state.undoStack.length === 0 || state.gameCompleted) {
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
        
        // Note: We intentionally don't modify the score or scoredCells here
        // Once a player earns points for a correct cell, they keep those points
        // even if they undo the action
        
        return {
          ...state,
          board: newBoard,
          filledCount: newFilledCount,
          cellNotes: newCellNotes,
          cellFeedback: newFeedback,
          undoStack: state.undoStack.slice(0, -1),
          redoStack: [...state.redoStack, lastAction],
          // Update timestamp on undo to prevent penalty on next move
          lastMoveTimestamp: Date.now(),
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
          // Update timestamp on note undo too
          lastMoveTimestamp: Date.now(),
        };
      }
      
      return state;
    }
    
    case ACTIONS.REDO: {
      // Prevent redo if game is completed or if redo stack is empty
      if (state.redoStack.length === 0 || state.gameCompleted) {
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
        
        // Handle scoring for redo
        let scoredCells = { ...state.scoredCells };
        let newScore = state.score;
        
        // If we're redoing a setValue action with a correct value, we update
        // scoredCells but don't award additional points if the cell was already scored
        if (newValue !== 0 && newValue === state.solutionBoard[row][col]) {
          // Only mark as scored, don't update score
          scoredCells[cellKey] = true;
        }
        
        return {
          ...state,
          board: newBoard,
          filledCount: newFilledCount,
          cellNotes: newCellNotes,
          cellFeedback: newFeedback,
          undoStack: [...state.undoStack, lastAction],
          redoStack: state.redoStack.slice(0, -1),
          lastMoveTimestamp: Date.now(), // Update timestamp on redo
          scoredCells,
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
          // Update timestamp on note redo too
          lastMoveTimestamp: Date.now(),
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
    case ACTIONS.NEW_GAME: // Both actions do the same thing for now
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
        undoStack: [], // Clear undo stack on game completion
        redoStack: [], // Clear redo stack on game completion
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

    case ACTIONS.SHOW_STATISTICS:
      return {
        ...state,
        showStatistics: true,
        timerActive: state.gameStarted && !state.isPaused ? false : state.timerActive,
      };

    case ACTIONS.HIDE_STATISTICS:
      return {
        ...state,
        showStatistics: false,
        timerActive: state.gameStarted && !state.isPaused && !state.showWinModal,
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
  const [statistics, setStatistics] = useState(initialStatistics);
  const [statsLoaded, setStatsLoaded] = useState(false);
  // Use refs for tracking win state to avoid render loops
  const hasWonRef = useRef(false);
  const statisticsRef = useRef(statistics);

  // Load statistics on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await loadStatistics();
        setStatistics(stats);
        statisticsRef.current = stats;
        setStatsLoaded(true);
      } catch (error) {
        console.error('Error loading statistics:', error);
        setStatsLoaded(true); // Set as loaded even if there was an error
      }
    };

    loadStats();
  }, []);

  // Update statistics ref when statistics change
  useEffect(() => {
    statisticsRef.current = statistics;
  }, [statistics]);

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
    // Early return if board is not filled or game is already completed
    if (state.filledCount < 81 || state.gameCompleted) {
      return;
    }
    
    // Check if all cells match the solution
    let won = true;
    for (let i = 0; i < 9 && won; i++) {
      for (let j = 0; j < 9 && won; j++) {
        if (state.board[i][j] !== state.solutionBoard[i][j]) {
          won = false;
        }
      }
    }

    if (won) {
      // Mark as won to prevent repeated processing
      hasWonRef.current = true;

      // Update statistics when game is won
      if (statsLoaded && state.currentDifficulty) {
        // Use the ref instead of the state
        const updatedStats = recordGameCompleted(
          statisticsRef.current,
          state.currentDifficulty,
          state.elapsedSeconds
        );
        setStatistics(updatedStats);

        // Use IIFE to handle async operation
        (async () => {
          try {
            await saveStatistics(updatedStats);
          } catch (error) {
            console.error('Error saving statistics on win:', error);
          }
        })();
      }

      dispatch({ type: ACTIONS.SHOW_WIN_MODAL });
    }
  }, [state.filledCount, state.board, state.solutionBoard, statsLoaded, state.currentDifficulty, state.elapsedSeconds, dispatch]);

  // Helper function to start a new game
  const startNewGame = (difficulty) => {
    // Reset win state when starting a new game
    hasWonRef.current = false;

    // Update statistics when starting a new game
    if (statsLoaded) {
      // Use the ref instead of the state to avoid stale state issues
      const updatedStats = recordGameStarted(statisticsRef.current, difficulty);
      setStatistics(updatedStats);
      // Use IIFE to handle async operation
      (async () => {
        try {
          await saveStatistics(updatedStats);
        } catch (error) {
          console.error('Error saving statistics on game start:', error);
        }
      })();
    }

    const { board, solution } = generateSudoku(difficulty);
    dispatch({
      type: ACTIONS.START_GAME,
      payload: { board, solution, difficulty },
    });
  };
  
  // Helper for handling number selection (supports both setValue and notes)
  // Memoized to prevent unnecessary re-renders in components that use this function
  const handleNumberSelect = useCallback((num) => {
    // Don't do anything if no cell is selected
    if (!state.selectedCell) return;

    // Don't modify board if game is completed
    if (state.gameCompleted) return;

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
  }, [state.selectedCell, state.gameCompleted, state.initialCells, state.notesMode, state.cellNotes, state.board, dispatch]);
  
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
  
  // Debug cheat mode to add notes with correct numbers
  const debugCheatMode = () => {
    // Don't proceed if no solution board is available
    if (!state.solutionBoard || !state.board) return;
    
    // Create a new notes object
    const newNotes = { ...state.cellNotes };
    
    // For each empty cell, add the correct number as a note
    state.board.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        // Only process empty cells that aren't initial cells
        const cellKey = `${rowIndex}-${colIndex}`;
        if (cell === 0 && !state.initialCells.includes(cellKey)) {
          // Get the correct value from the solution
          const correctValue = state.solutionBoard[rowIndex][colIndex];
          
          // If there are already notes for this cell, add the correct number if not already present
          if (newNotes[cellKey]) {
            if (!newNotes[cellKey].includes(correctValue)) {
              newNotes[cellKey] = [...newNotes[cellKey], correctValue];
            }
          } else {
            // Otherwise, create a new note with just the correct value
            newNotes[cellKey] = [correctValue];
          }
        }
      });
    });
    
    // Update the cell notes in the state
    dispatch({
      type: ACTIONS.RESTORE_SAVED_GAME,
      payload: { cellNotes: newNotes }
    });
  };
  
  // Cycle through available themes
  const cycleTheme = () => {
    const themeKeys = Object.keys(SUDOKU_THEMES);
    const currentIndex = themeKeys.indexOf(state.currentThemeName);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    const nextThemeName = themeKeys[nextIndex];
    
    dispatch({
      type: ACTIONS.CHANGE_THEME,
      payload: nextThemeName,
    });
  };
  
  // Helper to calculate last score change (used for animations)
  const getLastScoreChange = () => {
    const lastAction = state.undoStack.length > 0 ? state.undoStack[state.undoStack.length - 1] : null;
    if (!lastAction) return 0;
    
    // Check if the last action was a cell value being set
    if (lastAction.type === 'setValue') {
      const cellKey = lastAction.cellKey;
      // If this cell has a score stored, use it (contains the points earned)
      if (typeof state.scoredCells[cellKey] === 'number') {
        return state.scoredCells[cellKey];
      }
    }
    return 0;
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
    statistics,
    statsLoaded,
    debugCheatMode,
    getLastScoreChange,
    lastScoredCell: state.lastScoredCell
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