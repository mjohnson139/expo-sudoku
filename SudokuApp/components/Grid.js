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
  // Helper function to determine relation type between cells
  const getRelationType = (rowIndex, colIndex) => {
    if (!selectedCell) return null;
    
    const { row, col } = selectedCell;
    
    // Same value (non-zero)
    const selectedValue = board[row][col];
    const currentValue = board[rowIndex][colIndex];
    if (selectedValue !== 0 && currentValue === selectedValue) {
      return 'sameValue';
    }
    
    // Same box
    const selectedBoxRow = Math.floor(row / 3);
    const selectedBoxCol = Math.floor(col / 3);
    const cellBoxRow = Math.floor(rowIndex / 3);
    const cellBoxCol = Math.floor(colIndex / 3);
    
    if (selectedBoxRow === cellBoxRow && selectedBoxCol === cellBoxCol) {
      return 'box';
    }
    
    // Same row
    if (rowIndex === row) {
      return 'row';
    }
    
    // Same column
    if (colIndex === col) {
      return 'column';
    }
    
    return null;
  };

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
            const relationType = getRelationType(rowIndex, colIndex);
            
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
