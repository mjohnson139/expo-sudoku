/**
 * Game helper functions for Sudoku
 */

/**
 * Check if two cells are related (same row, column or box)
 * 
 * @param {number} cell1Row - First cell row index 
 * @param {number} cell1Col - First cell column index
 * @param {number} cell2Row - Second cell row index
 * @param {number} cell2Col - Second cell column index
 * @returns {boolean} True if cells are related
 */
export const areCellsRelated = (cell1Row, cell1Col, cell2Row, cell2Col) => {
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

/**
 * Update notes when a value is placed in a cell - removes that value from notes in related cells
 * 
 * @param {Object} notes - Object containing all cell notes
 * @param {number} row - Row where value was placed
 * @param {number} col - Column where value was placed
 * @param {number} value - The value that was placed
 * @returns {Object} Updated notes object
 */
export const updateRelatedNotes = (notes, row, col, value) => {
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

/**
 * Get initial cells positions from a board (cells that are filled in the starting puzzle)
 * 
 * @param {Array<Array<number>>} board - 2D array representing the Sudoku board
 * @returns {Array<string>} Array of cell keys (e.g. "0-1") for initial cells
 */
export const getInitialCells = (board) => {
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