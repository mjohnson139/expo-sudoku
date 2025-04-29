/**
 * Utility functions for managing undo/redo actions in the Sudoku game
 */

/**
 * Creates an undo action object for setting a value in a cell
 *
 * @param {string} cellKey - The cell key (e.g. "0-1") 
 * @param {number} previousValue - The previous value in the cell
 * @param {number} newValue - The new value set in the cell
 * @param {number[]|undefined} previousNotes - Previous notes in the cell (if any)
 * @returns {Object} Action object for the undo stack
 */
export const createSetValueAction = (cellKey, previousValue, newValue, previousNotes) => {
  return {
    type: newValue === 0 ? 'clearValue' : 'setValue',
    cellKey,
    previousValue,
    newValue,
    previousNotes,
  };
};

/**
 * Creates an undo action object for modifying notes in a cell
 *
 * @param {string} cellKey - The cell key (e.g. "0-1")
 * @param {number[]} previousNotes - Previous notes array
 * @param {number[]} newNotes - New notes array
 * @param {number} noteValue - The specific note value that changed
 * @param {boolean} isAdding - True if adding a note, false if removing
 * @returns {Object} Action object for the undo stack
 */
export const createNotesAction = (cellKey, previousNotes, newNotes, noteValue, isAdding) => {
  return {
    type: isAdding ? 'addNote' : 'removeNote',
    cellKey,
    previousNotes,
    newNotes,
    noteValue,
  };
};

/**
 * Transforms a board based on an undo/redo action
 * 
 * @param {Array<Array<number>>} board - Current board state
 * @param {Object} action - Action object describing the change
 * @returns {Array<Array<number>>} New board state
 */
export const applyBoardAction = (board, action) => {
  const { cellKey, previousValue, newValue } = action;
  const [row, col] = cellKey.split('-').map(Number);
  
  // Create a new board with the value change applied
  return board.map((r, ri) => 
    ri === row 
      ? r.map((c, ci) => ci === col ? 
          (action.type === 'undo' ? previousValue : newValue) : c) 
      : [...r]
  );
};

/**
 * Updates cell notes based on an undo/redo action
 * 
 * @param {Object} cellNotes - Current cell notes object
 * @param {Object} action - Action object describing the change
 * @returns {Object} Updated cell notes
 */
export const applyNotesAction = (cellNotes, action) => {
  const { cellKey, previousNotes, newNotes, type } = action;
  const updatedNotes = { ...cellNotes };
  
  const notesToApply = type === 'undo' ? previousNotes : newNotes;
  
  if (notesToApply && notesToApply.length > 0) {
    updatedNotes[cellKey] = notesToApply;
  } else {
    delete updatedNotes[cellKey];
  }
  
  return updatedNotes;
};