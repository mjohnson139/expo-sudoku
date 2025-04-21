// filepath: /Users/matthewjohnson/dev/expo-sudoku/SudokuApp/utils/boardFactory.js
import { getSudoku } from 'sudoku-gen';

/**
 * Converts an 81-character sudoku string into a 9x9 numeric array.
 * '-' or non-digit maps to 0.
 */
export const convertStringToBoard = (str) => {
  const cells = str.split('').map(c => (/\d/.test(c) ? Number(c) : 0));
  const board = [];
  for (let i = 0; i < 9; i++) {
    board.push(cells.slice(i * 9, i * 9 + 9));
  }
  return board;
};

/**
 * Generates a new sudoku puzzle and solution arrays for given difficulty.
 * @param {string} difficulty One of 'easy', 'medium', 'hard', 'expert'
 * @returns {{ board: number[][], solution: number[][] }}
 */
export const generateSudoku = (difficulty) => {
  const { puzzle, solution } = getSudoku(difficulty);
  return {
    board: convertStringToBoard(puzzle),
    solution: convertStringToBoard(solution),
  };
};

/**
 * Checks whether a value at given row and column matches the solution.
 * @param {number[][]} solutionBoard
 * @param {number} row
 * @param {number} col
 * @param {number} value
 * @returns {boolean}
 */
export const isCorrectValue = (solutionBoard, row, col, value) => {
  return solutionBoard[row] && solutionBoard[row][col] === value;
};

export default {
  convertStringToBoard,
  generateSudoku,
  isCorrectValue,
};