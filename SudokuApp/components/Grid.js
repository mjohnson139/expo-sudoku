import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Cell from './Cell';

const Grid = ({ 
  board, 
  onCellPress, 
  selectedCell, 
  initialCells = [], 
  theme, 
  showFeedback = false, 
  cellFeedback = {} 
}) => {
  // Calculate related cells based on selected cell
  const getRelatedCellsMap = (row, col) => {
    // Create a map to store relations with types
    const relations = {};
    
    // No related cells if nothing is selected
    if (row === null || col === null) return relations;
    
    // Define relation types
    const ROW = 'row';
    const COLUMN = 'column';
    const BOX = 'box';
    const SAME_VALUE = 'sameValue';
    
    const currentValue = board[row][col];
    
    // Add all cells in the same row
    for (let c = 0; c < 9; c++) {
      if (c !== col) {
        relations[`${row}-${c}`] = ROW;
      }
    }
    
    // Add all cells in the same column
    for (let r = 0; r < 9; r++) {
      if (r !== row) {
        relations[`${r}-${col}`] = COLUMN;
      }
    }
    
    // Add all cells in the same 3x3 box
    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;
    for (let r = boxStartRow; r < boxStartRow + 3; r++) {
      for (let c = boxStartCol; c < boxStartCol + 3; c++) {
        if (r !== row || c !== col) {
          relations[`${r}-${c}`] = BOX;
        }
      }
    }
    
    // Add all cells with the same value (if it's not empty)
    if (currentValue !== 0) {
      board.forEach((rowValues, r) => {
        rowValues.forEach((cellValue, c) => {
          if ((r !== row || c !== col) && cellValue === currentValue) {
            relations[`${r}-${c}`] = SAME_VALUE;
          }
        });
      });
    }
    
    return relations;
  };
  
  // Get related cells for currently selected cell
  const relatedCellsMap = selectedCell 
    ? getRelatedCellsMap(selectedCell.row, selectedCell.col) 
    : {};

  return (
    <View 
      style={[
        styles.grid, 
        { 
          backgroundColor: theme.colors.grid.background,
          borderColor: theme.colors.grid.border,
          borderWidth: 2,
        }
      ]}
    >
      {board.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((num, colIndex) => {
            const cellKey = `${rowIndex}-${colIndex}`;
            const isSelected = selectedCell && 
              selectedCell.row === rowIndex && 
              selectedCell.col === colIndex;
            const isInitialCell = initialCells.includes(cellKey);
            
            // Get the relation type for this cell (if any)
            const relationType = relatedCellsMap[cellKey];
            
            // Get feedback for this cell
            const isCorrect = showFeedback ? cellFeedback[cellKey] : null;
            
            // Border styling for 3x3 boxes
            const borderRight = (colIndex + 1) % 3 === 0 ? 2 : 1;
            const borderBottom = (rowIndex + 1) % 3 === 0 ? 2 : 1;
            const borderLeft = colIndex === 0 ? 2 : 1;
            const borderTop = rowIndex === 0 ? 2 : 1;

            const borderStyles = {
              borderRightWidth: borderRight,
              borderBottomWidth: borderBottom,
              borderLeftWidth: borderLeft,
              borderTopWidth: borderTop,
              borderRightColor: (colIndex + 1) % 3 === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
              borderBottomColor: (rowIndex + 1) % 3 === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
              borderLeftColor: colIndex === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
              borderTopColor: rowIndex === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
            };

            return (
              <TouchableOpacity
                key={`${rowIndex}-${colIndex}`}
                style={styles.cellContainer}
                onPress={() => onCellPress(rowIndex, colIndex)}
                activeOpacity={1}
              >
                <Cell 
                  value={num} 
                  isSelected={isSelected}
                  isInitialCell={isInitialCell}
                  relationType={relationType}
                  isCorrect={isCorrect}
                  showFeedback={showFeedback && !isInitialCell && num !== 0}
                  extraStyle={borderStyles}
                  theme={theme}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    width: 324,
    height: 324,
  },
  row: {
    flexDirection: 'row',
  },
  cellContainer: {
    width: 36,
    height: 36,
  }
});

export default Grid;
