/**
 * Helper functions for managing Sudoku notes
 */

/**
 * Calculate all possible values for a cell based on Sudoku rules
 * 
 * @param {Array<Array<number>>} board - Current state of the Sudoku board
 * @param {number} row - Row of the cell to check
 * @param {number} col - Column of the cell to check
 * @returns {Array<number>} Array of possible values (1-9) for the cell
 */
export const calculatePossibleValues = (board, row, col) => {
  // Start with all 9 values as possible
  const possibleValues = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  
  // Remove values present in the same row
  for (let i = 0; i < 9; i++) {
    const value = board[row][i];
    if (value !== 0) {
      possibleValues.delete(value);
    }
  }
  
  // Remove values present in the same column
  for (let i = 0; i < 9; i++) {
    const value = board[i][col];
    if (value !== 0) {
      possibleValues.delete(value);
    }
  }
  
  // Remove values present in the same 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const value = board[boxRow + i][boxCol + j];
      if (value !== 0) {
        possibleValues.delete(value);
      }
    }
  }
  
  // Convert the Set back to an Array and sort it
  return Array.from(possibleValues).sort();
};

/**
 * Calculate all possible notes for all empty cells on the board
 * 
 * @param {Array<Array<number>>} board - Current state of the Sudoku board
 * @returns {Object} Object with cell keys (e.g. "0-1") and arrays of possible values
 */
export const calculateAllNotes = (board) => {
  const allNotes = {};
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      // Only calculate notes for empty cells
      if (board[row][col] === 0) {
        const cellKey = `${row}-${col}`;
        const possibleValues = calculatePossibleValues(board, row, col);
        
        // Only add notes if there are possible values
        if (possibleValues.length > 0) {
          allNotes[cellKey] = possibleValues;
        }
      }
    }
  }
  
  return allNotes;
};
