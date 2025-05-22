/**
 * Debug utilities for Sudoku game development and QA testing
 * Contains functions to help with debugging and testing the game
 */

// Helper function to get initial cells positions from a board (copied from GameContext.js)
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

/**
 * Fill the board with correct solution values except for one cell
 * Used for QA testing of win conditions
 * 
 * @param {Object} gameState - Current game state containing board, solutions, etc.
 * @param {Function} dispatch - Dispatch function to update the game state
 * @param {String} actionType - Action type constant for updating game state
 * @returns {void}
 */
export const debugFillBoard = (gameState, dispatch, actionType) => {
  const { board, solutionBoard, initialBoardState } = gameState;
  
  // Create a new board from the current board state
  const newBoard = board.map(row => [...row]);
  const blanks = [];
  
  // Find all blank positions in the current puzzle
  board.forEach((row, r) => {
    row.forEach((v, c) => {
      if (v === 0) blanks.push({ r, c });
    });
  });
  
  // If there are no blanks or the board is already complete, return
  if (blanks.length === 0) return;
  
  // Choose a blank cell to leave unfilled - we'll use the last one
  const lastBlank = blanks[blanks.length - 1];
  
  // Fill all other blanks with solution values
  blanks.forEach(({ r, c }) => {
    if (r === lastBlank.r && c === lastBlank.c) return;
    newBoard[r][c] = solutionBoard[r][c];
  });
  
  // Count how many cells are filled
  let filledCount = 0;
  newBoard.forEach(row => {
    row.forEach(cell => {
      if (cell !== 0) filledCount++;
    });
  });
  
  // Create a record of which cells were initial (pre-filled)
  const initialCells = getInitialCells(initialBoardState);
  
  // Update state while preserving the current difficulty
  dispatch({
    type: actionType,
    payload: { 
      board: newBoard,
      initialCells: initialCells,
      filledCount: filledCount,
      // The solution board and difficulty remain unchanged
    },
  });
  
  // Clear all notes since most cells are filled now
  dispatch({
    type: actionType,
    payload: { cellNotes: {} }
  });
};

/**
 * Add correct value as a note to all empty cells
 * Used for testing and debugging
 * 
 * @param {Object} gameState - Current game state containing board, solutions, etc.
 * @param {Function} dispatch - Dispatch function to update the game state
 * @param {String} actionType - Action type constant for updating game state
 * @returns {void}
 */
export const debugCheatMode = (gameState, dispatch, actionType) => {
  const { board, solutionBoard, initialCells, cellNotes } = gameState;
  
  // Don't proceed if no solution board is available
  if (!solutionBoard || !board) return;
  
  // Create a new notes object
  const newNotes = { ...cellNotes };
  
  // For each empty cell, add the correct number as a note
  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      // Only process empty cells that aren't initial cells
      const cellKey = `${rowIndex}-${colIndex}`;
      if (cell === 0 && !initialCells.includes(cellKey)) {
        // Get the correct value from the solution
        const correctValue = solutionBoard[rowIndex][colIndex];
        
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
    type: actionType,
    payload: { cellNotes: newNotes }
  });
};
